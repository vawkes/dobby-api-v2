# Watchdog Timer Implementation

## Overview

The watchdog timer system automatically sends periodic info requests to all devices in the fleet to prevent device watchdog timeouts. This is implemented as a serverless AWS Lambda function triggered by EventBridge on a schedule.

## Architecture

```
EventBridge (every 5h50m) → Lambda Function → DynamoDB Scan → IoT Wireless → Devices
```

### Components

1. **Watchdog Lambda Function** (`lambda/watchdog/watchdog.ts`)
   - Scans ProductionLine table for all wireless device IDs
   - Sends info requests to devices in batches
   - Provides comprehensive logging and metrics

2. **Info Request Utility** (`lambda/utils/sendInfoRequest.ts`)
   - Lightweight utility for sending info requests without event logging
   - Used specifically for administrative operations

3. **EventBridge Rule** (CDK stack)
   - Triggers the watchdog function every 5 hours 50 minutes
   - Provides 10-minute safety margin for 6-hour watchdog timers

## Configuration

### Schedule
- **Frequency**: Every 5 hours 50 minutes (`rate(5 hours 50 minutes)`)
- **Safety Margin**: 10 minutes before 6-hour watchdog timeout
- **EventBridge Rule**: Automatically enabled in CDK stack

### Lambda Function Settings
- **Runtime**: Node.js 20.x
- **Timeout**: 15 minutes (to handle large device fleets)
- **Memory**: 512 MB (sufficient for processing device lists)
- **Concurrency**: Single execution (no concurrent runs needed)

### Permissions
- **DynamoDB**: Read access to ProductionLine table
- **IoT Wireless**: `SendDataToWirelessDevice` for all resources
- **CloudWatch**: Automatic logging and metrics

## Usage

### Automatic Operation
The watchdog timer runs automatically once deployed. No manual intervention is required.

### Manual Testing
To manually trigger the watchdog function:

```bash
aws lambda invoke \
  --function-name WatchdogFunction \
  --payload '{}' \
  response.json
```

### Monitoring
Monitor the watchdog function using:

1. **CloudWatch Logs**: Detailed execution logs
2. **CloudWatch Metrics**: Lambda execution metrics
3. **Function Response**: Success/failure counts in response body

## Implementation Details

### Device Discovery
The function scans the ProductionLine table to discover all devices:

```typescript
// Scans with pagination for large device fleets
const devices = await getAllWirelessDeviceIds(dynamodb);
```

### Batch Processing
Devices are processed in batches of 10 to avoid overwhelming downstream services:

```typescript
const batchSize = 10;
for (let i = 0; i < devices.length; i += batchSize) {
    // Process batch concurrently
    await Promise.allSettled(batch.map(sendInfoRequest));
}
```

### Error Handling
- Individual device failures don't stop the overall process
- Comprehensive error logging for failed devices
- Success/failure metrics in function response

## Payload Structure

The info request payload follows the existing event format:

```
Byte 0: Command Type (8 = INFORMATION_REQUEST)
Bytes 1-4: GPS Time Epoch (little endian, 0 for current time)
```

## Cost Analysis

For a fleet of 1,000 devices running every ~6 hours:

- **Lambda**: ~$0.05/month
- **DynamoDB Scans**: ~$0.03/month  
- **IoT Messages**: ~$14.40/month
- **EventBridge**: ~$0.00/month

**Total**: ~$14.48/month for 1,000 devices

## Scale Considerations

### Current Limits (Working Well)
- **Up to 10,000 devices**: Current implementation handles well
- **Execution time**: 2-10 minutes for typical fleets
- **Memory usage**: Well within 512MB allocation

### Scale Breaking Points
- **25,000+ devices**: May hit 15-minute Lambda timeout
- **50,000+ devices**: Consider multi-Lambda fan-out pattern
- **100,000+ devices**: Architecture redesign recommended

### Optimization Options
For larger fleets, consider:
1. Multi-Lambda fan-out pattern
2. Step Functions for orchestration
3. SQS-based queuing system
4. Device health tracking to skip offline devices

## Troubleshooting

### Common Issues

1. **No devices found**
   - Check ProductionLine table has wireless_device_id entries
   - Verify table permissions

2. **High failure rate**
   - Check IoT Wireless connectivity
   - Verify device IDs are valid
   - Monitor for throttling

3. **Function timeout**
   - Reduce batch size for faster processing
   - Consider splitting large fleets

### Monitoring Queries

CloudWatch Logs Insights queries:

```sql
# Success rate analysis
fields @timestamp, @message
| filter @message like /Watchdog timer feed completed/
| stats count() by bin(5m)

# Device failure analysis
fields @timestamp, @message
| filter @message like /Failed to send watchdog/
| stats count() by bin(1h)
```

## Testing

Run the test suite:

```bash
npm test -- watchdog-simple.test.ts
```

The tests verify:
- Correct payload generation
- Error handling
- Device ID format support
- Message sending functionality

## Deployment

The watchdog timer is automatically deployed with the CDK stack:

```bash
npm run cdk deploy
```

The function will start running automatically based on the EventBridge schedule.

## Related Files

- `lambda/watchdog/watchdog.ts` - Main function
- `lambda/utils/sendInfoRequest.ts` - Utility function
- `test/watchdog-simple.test.ts` - Test suite
- `lib/dobby-api-v2-stack.ts` - CDK configuration
- `WATCHDOG_TIMER.md` - This documentation
