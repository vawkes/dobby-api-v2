import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { PayloadType, IoTEvent } from './iotSchema';

// Import handlers
import { handleInstantPower } from './handlers/instantPower';
import { handleCumulativeEnergy } from './handlers/cumulativeEnergy';
import { handleInfoRequest } from './handlers/infoRequest';
import { handleModelNumber } from './handlers/modelNumber';
import { handleSerialNumber } from './handlers/serialNumber';
import { handleFirmwareVersion } from './handlers/firmwareVersion';
import { handleOperationalState } from './handlers/operationalState';
import { handleConnectionInfo } from './handlers/connectionInfo';
import { handleGridcubeFirmwareVersion } from './handlers/gridcubeFirmwareVersion';

/**
 * Handles IoT data from Grid Cube devices
 * This function is triggered by an AWS IoT Core rule
 */
export const handler = async (event: IoTEvent): Promise<any> => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    try {
        // Initialize DynamoDB client
        const dynamodb = new DynamoDB({ region: "us-east-1" });

        // Extract device ID and payload from the event
        const deviceId = event.uplink.WirelessDeviceId;
        const encodedPayload = event.uplink.PayloadData;

        console.log(`Processing data for device ${deviceId}`);

        // Decode base64 payload - matching Python implementation
        const decodedPayload = Buffer.from(encodedPayload, 'base64');
        console.log('Decoded payload (base64):', decodedPayload.toString('hex'));

        // Convert to hex string and then to buffer (matching the Python implementation)
        // In Python: converted_payload = bytes.fromhex(str(decoded_payload)[2:-1])
        const hexString = decodedPayload.toString('hex');
        const convertedPayload = Buffer.from(hexString, 'hex');
        console.log('Converted payload (hex):', convertedPayload.toString('hex'));

        // Get payload type from the first byte
        const payloadType = convertedPayload[0];
        console.log(`Payload type: ${payloadType}`);

        // Route to appropriate handler based on payload type
        switch (payloadType) {
            case PayloadType.INSTANT_POWER:
                await handleInstantPower(convertedPayload, deviceId, dynamodb);
                break;
            case PayloadType.CUMULATIVE_ENERGY:
                await handleCumulativeEnergy(convertedPayload, deviceId, dynamodb);
                break;
            case PayloadType.INFO_REQUEST:
                await handleInfoRequest(convertedPayload, deviceId);
                break;
            case PayloadType.MODEL_NUMBER:
                await handleModelNumber(convertedPayload, deviceId, dynamodb);
                break;
            case PayloadType.SERIAL_NUMBER:
                await handleSerialNumber(convertedPayload, deviceId, dynamodb);
                break;
            case PayloadType.FIRMWARE_VERSION:
                await handleFirmwareVersion(convertedPayload, deviceId, dynamodb);
                break;
            case PayloadType.OPERATIONAL_STATE:
                await handleOperationalState(convertedPayload, deviceId, dynamodb);
                break;
            case PayloadType.CONNECTION_INFO:
                await handleConnectionInfo(convertedPayload, deviceId, dynamodb);
                break;
            case PayloadType.GRIDCUBE_FIRMWARE_VERSION:
                await handleGridcubeFirmwareVersion(convertedPayload, deviceId, dynamodb);
                break;
            default:
                console.log(`No handler for payload type ${payloadType}`);
                break;
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: 'Data processed successfully',
                device_id: deviceId
            })
        };
    } catch (error) {
        console.error('Error processing IoT data:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                message: 'Error processing data',
                error: (error as Error).message
            })
        };
    }
}; 