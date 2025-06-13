# Grid Cube IoT Data Processing Lambda

This Lambda function processes binary IoT data from Grid Cube devices. It is triggered by an AWS IoT Core rule and is designed to handle various message types sent by the devices.

## Overview

When a Grid Cube device sends data to AWS IoT Core, this Lambda function:

1. Decodes the base64 encoded binary payload
2. Converts the decoded data to hex and back to a buffer (matching the Python implementation)
3. Identifies the message type from the first byte of the payload
4. Processes the data according to the message type
5. Stores time-series data in both Amazon Timestream and DynamoDB
6. Updates device information in the `DobbyInfo` DynamoDB table
7. Sends acknowledgments back to the device via IoT Wireless

## Binary Message Types

The function handles the following binary message types:

| Type | Description            | Data Format                                     |
|------|------------------------|--------------------------------------------------|
| 0    | Instant Power          | 1 byte type + 1 byte msgNumber + 6 bytes value + 4 bytes GPS timestamp |
| 1    | Cumulative Energy      | 1 byte type + 1 byte msgNumber + 6 bytes value + 4 bytes GPS timestamp |
| 2    | Info Request           | 1 byte type                                     |
| 3    | Model Number           | 1 byte type + string                            |
| 4    | Serial Number          | 1 byte type + string                            |
| 5    | Firmware Version       | 1 byte type + string                            |
| 6    | Operational State      | 1 byte type + 1 byte state                      |
| 7    | Connection Info        | 1 byte type + 1 byte RSSI + 1 byte linkType     |
| 8    | GridCube FW Version    | 1 byte type + string                            |

## Timestream Integration

The function stores measurement data in Amazon Timestream for time-series analysis and querying. The measurements follow this structure:

- Database: GridCubeData
- Table: DeviceMeasurements
- Dimensions: device_id
- Measures: instant_power, cumulative_energy

## IoT Wireless Integration

The function sends acknowledgments back to devices via the AWS IoT Wireless API when receiving data. This completes the request-response cycle with the device.

## GPS Timestamp Conversion

The binary payloads include GPS timestamps, which are converted to UTC for storage:
- GPS epoch started on January 6, 1980
- The function converts GPS timestamps to Unix epoch times for DynamoDB and Timestream

## IoT Core Setup

The function is triggered by an IoT Core rule that routes messages from wireless devices to this Lambda.

## Event Format

The expected event format from IoT Core is:

```json
{
    "uplink": {
        "WirelessDeviceId": "12345678-abcd-1234-efgh-1234567890ab",
        "PayloadData": "AAECRDA=" // Base64 encoded binary data
    }
}
```

## Testing

You can test this Lambda function using the provided test event in `testIoTEvent.json`. The included payload is a sample binary message for operational state.

### Test Payload Details

The test event contains a Base64 encoded payload (`BgEBZGq2Kw==`) which decodes to:

```
06 01 01 64 6a b6 2b
```

This binary data represents:
- `06`: Payload type 6 (Operational State)
- `01`: Message number 1
- `01`: Operational state 1 (RUNNING_NORMAL)
- `646ab62b`: GPS timestamp (1684818475 in decimal)

To create test payloads for different operational states, you can modify the third byte to one of the following values:
- 0: IDLE_NORMAL
- 1: RUNNING_NORMAL
- 2: RUNNING_CURTAILED
- 3: RUNNING_HEIGHTENED
- 4: IDLE_CURTAILED
- 5: SGD_ERROR
- 6: IDLE_HEIGHTENED
- 7: CYCLING_ON
- 8: CYCLING_OFF
- 9: VARIABLE_FOLLOWING
- 10: VARIABLE_NOT_FOLLOWING
- 11: IDLE_OPT_OUT
- 12: RUNNING_OPT_OUT
- 13: RUNNING_PRICE_STREAM
- 14: IDLE_PRICE_STREAM

## Required IAM Permissions

The Lambda function requires these permissions:
- DynamoDB: Read/Write to DobbyInfo and ShiftedData tables
- Timestream: WriteRecords and DescribeEndpoints
- IoT Wireless: SendDataToWirelessDevice

## Deployment

This Lambda function is deployed using AWS CDK. The IoT Core rule and Lambda function are defined in the `dobby-api-v2-stack.ts` file. 