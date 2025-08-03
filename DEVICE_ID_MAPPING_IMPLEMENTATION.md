# Device ID Mapping Implementation

## Overview

This implementation provides a seamless transition from using
`wireless_device_id` (UUID) to `device_id` (6-digit) for API interactions while
maintaining backward compatibility for device communications.

## Key Changes

### 1. New Utility Functions (`lambda/utils/deviceIdMapping.ts`)

- **`getWirelessDeviceId(dynamodb, deviceId)`**: Retrieves wireless device ID
  from ProductionLine table
- **`getDeviceId(dynamodb, wirelessDeviceId)`**: Retrieves device ID from
  wireless device ID
- **`resolveDeviceIdForCommunication(dynamodb, deviceId)`**: Resolves device ID
  for device communications (returns wireless_device_id)
- **`resolveDeviceIdForResponse(dynamodb, deviceId)`**: Resolves device ID for
  API responses (returns 6-digit device_id)

### 2. Updated API Endpoints

#### Devices API (`lambda/devices/devices.ts`)

- **GET /devices**: 
  - Lists all accessible devices
  - Resolves 6-digit device IDs from CompanyDevices to wireless device IDs for filtering
  - Returns devices with 6-digit device IDs in response
- **GET /devices/:deviceId**:
  - Accepts 6-digit device ID in URL
  - Resolves to wireless device ID for database lookup
  - Returns 6-digit device ID in response
- **GET /devices/:deviceId/data**:
  - Accepts 6-digit device ID in URL
  - Resolves to wireless device ID for database lookup
  - Returns 6-digit device ID in response

#### Events API (`lambda/events/events.ts`)

- **POST /events**:
  - Accepts 6-digit device ID in request body
  - Resolves to wireless device ID before calling event handlers
  - Event handlers receive wireless device ID for device communications

### 3. Event Handlers

All event handlers continue to work as before, but now receive the resolved
wireless device ID instead of the original device ID. This ensures device
communications use the correct wireless device ID.

## How It Works

### API Interactions (User-Facing)

1. Users provide 6-digit device IDs (e.g., "000012")
2. API endpoints resolve these to wireless device IDs for database operations
3. API responses always return 6-digit device IDs

### Device Communications (Internal)

1. Event handlers receive wireless device IDs
2. Device commands are sent using wireless device IDs
3. Device communications remain unchanged

## Database Schema Requirements

### ProductionLine Table

- Primary key: `device_id` (6-digit string)
- Must contain `wireless_device_id` field
- Optional: GSI on `wireless_device_id` for reverse lookups

### Example Record

```json
{
    "device_id": {
        "S": "000012"
    },
    "wireless_device_id": {
        "S": "558fab41-f090-4675-a7b0-f5060297d4e9"
    },
    "timestamp": {
        "N": "1750130873"
    },
    "created_at": {
        "S": "2025-06-16T20:27:53.473431"
    },
    "status": {
        "S": "active"
    },
    "thing_arn": {
        "S": "arn:aws:iot:us-east-1:530256939393:thing/000012"
    }
}
```

## Backward Compatibility

- Existing APIs continue to work with 6-digit device IDs
- Device communications remain unchanged
- No breaking changes to existing functionality

## Testing

Comprehensive tests are included in `test/device-id-mapping.test.ts` covering:

- Device ID resolution for communications
- Device ID resolution for responses
- Error handling for non-existent devices
- Edge cases with invalid IDs

## Migration Notes

1. **No immediate action required**: Existing functionality continues to work
2. **Frontend updates**: Update frontend to use 6-digit device IDs in API calls
3. **Database**: Ensure ProductionLine table contains the required mapping data
4. **API Schema Updates**: Updated company device schemas to accept 6-digit device IDs instead of UUIDs
5. **Monitoring**: Monitor API responses to ensure device IDs are correctly
   resolved

## Security Considerations

- Device ID resolution is performed server-side
- No exposure of wireless device IDs to end users
- Access control remains unchanged
- Device communications remain secure
