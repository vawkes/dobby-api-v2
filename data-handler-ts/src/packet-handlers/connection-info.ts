import { writeDeviceInfoToDynamo } from '../utils/dynamo';

export interface ConnectionInfoSignalData {
  rssi: number;
  snr: number;
  link_type: number;
}

export const parseConnectionInfoSignalData = (payload: Buffer): ConnectionInfoSignalData | undefined => {
  if (payload[0] !== 7) {
    return undefined;
  }

  return {
    rssi: payload.readInt8(1),
    snr: payload.readInt8(2),
    link_type: payload.readUInt32BE(3),
  };
};

export const handleConnectionInfo = async (payload: Buffer, deviceId: string): Promise<void> => {
  // Verify response type is 7
  const signalData = parseConnectionInfoSignalData(payload);
  if (signalData === undefined) {
    console.error(`Invalid response type for connection info: ${payload[0]}`);
    return;
  }

  console.log(`RSSI: ${signalData.rssi}`);
  console.log(`SNR: ${signalData.snr}`);
  console.log(`Link Type: ${signalData.link_type}`);

  // Store the parsed values in DynamoDB
  await writeDeviceInfoToDynamo(deviceId, 'rssi', signalData.rssi);
  await writeDeviceInfoToDynamo(deviceId, 'snr', signalData.snr);
  await writeDeviceInfoToDynamo(deviceId, 'link_type', signalData.link_type);
};
