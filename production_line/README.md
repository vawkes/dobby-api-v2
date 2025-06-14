# Dobby Production Line Application

This application manages the production line process for Dobby devices using AWS Sidewalk, handling device provisioning, certificate generation, and device information storage.

## Prerequisites

- Python 3.7 or higher
- AWS CLI configured with appropriate credentials
- AWS IoT Core service enabled
- AWS IoT Wireless service enabled
- DynamoDB table created
- AWS Sidewalk account and permissions
- Sidewalk Device Profile ID
- Sidewalk Destination Name

## Setup

1. Install the required dependencies:
```bash
pip install -r requirements.txt
```

2. Create a `.env` file in the production_line directory with the following variables:
```
DYNAMODB_TABLE_NAME=your_dynamodb_table_name
AWS_REGION=your_aws_region
SIDEWALK_DEVICE_PROFILE_ID=your_sidewalk_device_profile_id
SIDEWALK_DESTINATION_NAME=your_sidewalk_destination_name
```

3. Ensure your AWS credentials have the following permissions:
- IoT Core: CreateThing, CreateKeysAndCertificate, AttachThingPrincipal, CreatePolicy, AttachPolicy
- IoT Wireless: CreateWirelessDevice
- DynamoDB: PutItem

## Usage

Run the application:
```bash
python production_line.py
```

The application will:
1. Prompt for a device ID
2. Create an AWS IoT thing for Sidewalk
3. Generate and attach certificates
4. Register the device with AWS IoT Wireless
5. Store device information in DynamoDB
6. Return the device information, certificates, and wireless device ID

## Output

The application returns a JSON object containing:
- Device information stored in DynamoDB
- Certificate information including:
  - Certificate ARN
  - Certificate ID
  - Certificate PEM
  - Key pair
- Wireless device ID for Sidewalk communication

## Error Handling

The application includes comprehensive error handling for:
- Sidewalk device creation
- Certificate generation
- AWS IoT Wireless registration
- DynamoDB operations

All errors are logged and returned in the response object.

## Sidewalk-Specific Notes

1. The device ID is used as the Sidewalk Manufacturing Serial Number (SMSN)
2. The application creates a Sidewalk-specific IoT policy with necessary permissions
3. The device is registered with AWS IoT Wireless service for Sidewalk communication
4. The device profile and destination must be pre-configured in your AWS account 