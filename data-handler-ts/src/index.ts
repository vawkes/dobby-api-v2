import { APIGatewayProxyResult } from 'aws-lambda';
import { handleInstantPower } from './packet-handlers/instant-power';
import { handleCumulativeEnergy } from './packet-handlers/cumulative-energy';
import { handleInfoRequest } from './packet-handlers/info-request';
import { handleModelNumber } from './packet-handlers/model-number';
import { handleSerialNumber } from './packet-handlers/serial-number';
import { handleFwVersion } from './packet-handlers/fw-version';
import { handleOperationalState } from './packet-handlers/operational-state';
import { handleConnectionInfo } from './packet-handlers/connection-info';
import { handleGridcubeFwVersion } from './packet-handlers/gridcube-fw-version';
import { handleEventAcknowledgment } from './packet-handlers/event-acknowledgment';

export const handler = async (event: any): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Event:', JSON.stringify(event));

    const deviceId = event.WirelessDeviceId;
    const payload = event.PayloadData;

    // First decode base64 to get hex string
    const base64Decoded = Buffer.from(payload, 'base64').toString();
    console.log('Base64 decoded (hex string):', base64Decoded);

    // Then decode hex string to get actual bytes
    const decodedPayload = Buffer.from(base64Decoded, 'hex');
    console.log('Final decoded payload:', decodedPayload);

    // Get payload type from first byte
    const payloadType = decodedPayload[0];
    console.log('Payload type:', payloadType);

    // Handle different packet types
    switch (payloadType) {
      case 0:
        await handleInstantPower(decodedPayload, deviceId);
        break;
      case 1:
        await handleCumulativeEnergy(decodedPayload, deviceId);
        break;
      case 2:
        await handleInfoRequest(decodedPayload, deviceId);
        break;
      case 3:
        await handleModelNumber(decodedPayload, deviceId);
        break;
      case 4:
        await handleSerialNumber(decodedPayload, deviceId);
        break;
      case 5:
        await handleFwVersion(decodedPayload, deviceId);
        break;
      case 6:
        await handleOperationalState(decodedPayload, deviceId);
        break;
      case 7:
        await handleConnectionInfo(decodedPayload, deviceId);
        break;
      case 8:
        await handleGridcubeFwVersion(decodedPayload, deviceId);
        break;
      case 9:
        await handleEventAcknowledgment(decodedPayload, deviceId);
        break;
      default:
        console.log(`No handler for payload type ${payloadType}`);
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `Unsupported payload type: ${payloadType}` })
        };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Success' })
    };
  } catch (error) {
    console.error('Error processing payload:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}; 