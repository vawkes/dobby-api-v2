import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handleInstantPower } from './packet-handlers/instant-power';
import { handleCumulativeEnergy } from './packet-handlers/cumulative-energy';
import { handleInfoRequest } from './packet-handlers/info-request';
import { handleModelNumber } from './packet-handlers/model-number';
import { handleSerialNumber } from './packet-handlers/serial-number';
import { handleFwVersion } from './packet-handlers/fw-version';
import { handleOperationalState } from './packet-handlers/operational-state';
import { handleConnectionInfo } from './packet-handlers/connection-info';
import { handleGridcubeFwVersion } from './packet-handlers/gridcube-fw-version';

export const handler = async (event: any): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Event:', JSON.stringify(event));
    
    const deviceId = event.uplink.WirelessDeviceId;
    const payload = event.uplink.PayloadData;

    // Decode base64 payload
    const decodedPayload = Buffer.from(payload, 'base64');
    const convertedPayload = Buffer.from(decodedPayload.toString('hex'), 'hex');
    console.log('Converted payload:', convertedPayload);

    // Get payload type from first byte
    const payloadType = convertedPayload[0];

    // Handle different packet types
    switch (payloadType) {
      case 0:
        await handleInstantPower(convertedPayload, deviceId);
        break;
      case 1:
        await handleCumulativeEnergy(convertedPayload, deviceId);
        break;
      case 2:
        await handleInfoRequest(convertedPayload, deviceId);
        break;
      case 3:
        await handleModelNumber(convertedPayload, deviceId);
        break;
      case 4:
        await handleSerialNumber(convertedPayload, deviceId);
        break;
      case 5:
        await handleFwVersion(convertedPayload, deviceId);
        break;
      case 6:
        await handleOperationalState(convertedPayload, deviceId);
        break;
      case 7:
        await handleConnectionInfo(convertedPayload, deviceId);
        break;
      case 8:
        await handleGridcubeFwVersion(convertedPayload, deviceId);
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