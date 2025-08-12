# DynamoDB Modernization Guide

## Overview

This codebase currently has **significant inconsistencies** in DynamoDB usage patterns that impact readability, maintainability, and performance. This guide provides specific steps to modernize and standardize DynamoDB operations using AWS SDK v3 best practices.

## Current State Assessment

### ✅ Files Following Best Practices
- `data-handler-ts/src/utils/dynamo.ts` - Uses DynamoDBDocumentClient properly
- `lambda/utils/updateEvent.ts` - Recently updated to follow best practices

### ❌ Files Needing Modernization
- `lambda/utils/saveEvent.ts` - Uses low-level DynamoDB client with manual marshalling
- `lambda/events/events.ts` - Multiple instances of low-level client, includes expensive scan operation
- `lambda/companies/companies.ts` - Low-level client usage throughout
- `lambda/devices/devices.ts` - Low-level client usage throughout
- `data-handler-ts/src/packet-handlers/event-acknowledgment.ts` - Low-level client usage

## Problems with Current Implementation

1. **Mixed SDK Approaches**: Some files use `DynamoDBDocumentClient` (modern), others use low-level `DynamoDB` client (legacy)
2. **Manual Data Marshalling**: Manual use of `marshall()` instead of automatic handling
3. **Performance Issues**: Client instantiation inside functions, expensive scan operations
4. **Inconsistent Error Handling**: Mix of throwing errors vs returning booleans
5. **Type Safety**: Lack of proper TypeScript interfaces for DynamoDB items

## Implementation Plan

### Phase 1: Create Shared DynamoDB Utility (Priority: HIGH)

Create `lambda/utils/dynamodb-client.ts`:

```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Shared client instances - created once at module level for performance
const client = new DynamoDBClient({ region: "us-east-1" });
export const docClient = DynamoDBDocumentClient.from(client);

// Export the base client for cases where low-level access is needed
export const dynamoDBClient = client;
```

### Phase 2: Modernize saveEvent.ts (Priority: HIGH)

**File**: `lambda/utils/saveEvent.ts`

**Current Issues**:
- Uses low-level `DynamoDB` client
- Manual `marshall()` usage
- Verbose and error-prone

**Replace entire file with**:

```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { EventSchemaType, EventType } from "../events/eventsSchema";

const client = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);

// Interface for the flattened event structure that matches DynamoDB
interface FlattenedEvent {
    event_id: string;
    event_type: EventType;
    device_id: string;
    event_sent: boolean;
    event_ack: boolean;
    timestamp: number; // Always required as sort key
    created_at: number;
    [key: string]: any; // Allow any additional fields from event_data
}

/**
 * Saves an event to the DynamoDB table
 * @param event The event to save
 * @returns Promise<boolean> True if the event was saved successfully
 */
export async function saveEventToDynamoDB(event: EventSchemaType): Promise<boolean> {
    try {
        // Start with the base flattened event structure
        const flattenedEvent: FlattenedEvent = {
            event_id: event.event_id,
            event_type: event.event_type,
            device_id: event.event_data.device_id as string, // This is the wireless device ID (UUID)
            event_sent: (event.event_data.event_sent as boolean) || false,
            event_ack: false, // Default to false
            timestamp: event.event_data.start_time, // Use GPS epoch timestamp (seconds)
            created_at: Date.now()
        };

        console.log(`Saving event ${event.event_id} with device_id: ${event.event_data.device_id}, GPS epoch timestamp: ${event.event_data.start_time}`);

        // Copy ALL fields from event_data to preserve complete event information
        Object.entries(event.event_data).forEach(([key, value]) => {
            // Skip device_id since we already have it at the top level
            if (key !== 'device_id') {
                flattenedEvent[key] = value;
            }
        });

        // Save the event to DynamoDB using DocumentClient (no manual marshalling needed)
        const command = new PutCommand({
            TableName: "DobbyEvent",
            Item: flattenedEvent
        });

        await docClient.send(command);

        console.log(`Event ${event.event_id} saved to DynamoDB successfully with device_id: ${flattenedEvent.device_id}, GPS epoch timestamp: ${event.event_data.start_time}`);
        return true;
    } catch (error) {
        console.error("Error saving event to DynamoDB:", error);
        throw error; // Consider throwing instead of returning false for better error handling
    }
}
```

**Key Changes**:
- Uses `DynamoDBDocumentClient` instead of low-level client
- Uses `PutCommand` instead of `putItem`
- Removes manual `marshall()` call
- Automatic type handling
- Consider throwing errors for better TypeScript error handling

### Phase 3: Fix Performance Issue in events.ts (Priority: HIGH)

**File**: `lambda/events/events.ts`
**Line**: 62

**Current Problem**:
```typescript
const results = await dynamodb.scan({ TableName: "DobbyEvent" });
```

**Issue**: Scan operations are expensive and against coding guidelines (see memory about avoiding scans)

**Solution**: Replace with proper query using GSI:

```typescript
// Replace the scan with proper queries using the device_id-index
const eventPromises = accessibleDeviceIds.map(deviceId => {
    const queryCommand = new QueryCommand({
        TableName: "DobbyEvent",
        IndexName: "device_id-index",
        KeyConditionExpression: "device_id = :deviceId",
        ExpressionAttributeValues: {
            ":deviceId": deviceId
        }
    });
    return docClient.send(queryCommand);
});

const queryResults = await Promise.all(eventPromises);
const allEvents = queryResults.flatMap(result => result.Items || []);
```

### Phase 4: Modernize Client Instantiation Patterns (Priority: MEDIUM)

**Files to Update**:
- `lambda/events/events.ts`
- `lambda/companies/companies.ts`
- `lambda/devices/devices.ts`

**Current Pattern** (found multiple times):
```typescript
// Inside function - BAD for performance
const dynamodb = new DynamoDB({ "region": "us-east-1" });
```

**New Pattern**:
```typescript
// At module level - GOOD for performance
import { docClient } from '../utils/dynamodb-client';

// Then use docClient with commands instead of dynamodb
```

**Example Conversion**:

**Before**:
```typescript
const dynamodb = new DynamoDB({ "region": "us-east-1" });
const result = await dynamodb.getItem({
    TableName: "Companies",
    Key: {
        id: { S: companyId }
    }
});
```

**After**:
```typescript
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../utils/dynamodb-client';

const command = new GetCommand({
    TableName: "Companies",
    Key: {
        id: companyId  // No need for { S: companyId }
    }
});
const result = await docClient.send(command);
```

### Phase 5: Update data-handler-ts/src/packet-handlers/event-acknowledgment.ts (Priority: LOW)

**Current**:
```typescript
import { DynamoDB } from '@aws-sdk/client-dynamodb';
const dynamodb = new DynamoDB({ region: 'us-east-1' });
```

**Replace with**:
```typescript
// Remove DynamoDB import and instantiation
// File only calls updateEventAsAcknowledged() which already uses proper patterns
```

This file doesn't directly use DynamoDB operations, so just remove the unused import and instantiation.

## Implementation Steps

### Step 1: Create Shared Client
1. Create `lambda/utils/dynamodb-client.ts` with the code above
2. Test that it exports correctly

### Step 2: Update saveEvent.ts
1. Replace the entire file content with the modernized version above
2. Test that events are still saved correctly
3. Verify that the data structure remains the same

### Step 3: Fix Scan Operation
1. In `lambda/events/events.ts`, replace the scan operation with proper queries
2. Test that the API still returns the same data
3. Monitor performance improvements

### Step 4: Gradual Migration
1. Pick one file at a time from the modernization list
2. Convert client instantiation and operations
3. Test thoroughly before moving to the next file

### Step 5: Clean Up
1. Remove unused DynamoDB imports
2. Update any remaining manual marshalling
3. Consider standardizing error handling patterns

## Testing Checklist

For each file updated:
- [ ] Events are saved/retrieved correctly
- [ ] Data structure remains unchanged
- [ ] Error handling works as expected
- [ ] Performance is same or better
- [ ] TypeScript compilation succeeds
- [ ] Linting passes

## Benefits After Implementation

1. **Consistency**: All DynamoDB operations use the same patterns
2. **Readability**: Cleaner code without manual marshalling
3. **Performance**: Shared client instances, optimized queries
4. **Maintainability**: Easier to understand and modify
5. **Type Safety**: Better TypeScript support
6. **Error Handling**: More consistent error patterns

## Files Requiring Updates Summary

| File | Priority | Main Changes |
|------|----------|--------------|
| `lambda/utils/dynamodb-client.ts` | HIGH | Create new shared utility |
| `lambda/utils/saveEvent.ts` | HIGH | Convert to DocumentClient, remove marshall |
| `lambda/events/events.ts` | HIGH | Fix scan operation, modernize client usage |
| `lambda/companies/companies.ts` | MEDIUM | Convert all DynamoDB operations |
| `lambda/devices/devices.ts` | MEDIUM | Convert all DynamoDB operations |
| `data-handler-ts/src/packet-handlers/event-acknowledgment.ts` | LOW | Remove unused DynamoDB import |

## Reference Documentation

- [AWS SDK v3 DynamoDB DocumentClient Migration Guide](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrate-dynamodb-doc-client.html)
- [AWS SDK v3 Command Pattern](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/using-dynamodb.html)
- [TypeScript Support in AWS SDK v3](https://aws.amazon.com/blogs/developer/first-class-typescript-support-in-modular-aws-sdk-for-javascript/)
