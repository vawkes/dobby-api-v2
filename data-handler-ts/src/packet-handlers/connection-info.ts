import { writeDeviceInfoToDynamo } from '../utils/dynamo';

export const handleConnectionInfo = async (payload: Buffer, deviceId: string): Promise<void> => {
  // Verify response type is 7
  if (payload[0] !== 7) {
    console.error(`Invalid response type for connection info: ${payload[0]}`);
    return;
  }

  // Parse RSSI (signed int8)
  const rssi = new DataView(payload.buffer).getInt8(1);

  // Parse SNR (signed int8)
  const snr = new DataView(payload.buffer).getInt8(2);

  // Parse Link Type (4 bytes, little-endian)
  const linkType = new DataView(payload.buffer).getUint32(3, true);

  console.log(`RSSI: ${rssi}`);
  console.log(`SNR: ${snr}`);
  console.log(`Link Type: ${linkType}`);

  // Store the parsed values in DynamoDB
  await writeDeviceInfoToDynamo(deviceId, 'rssi', rssi);
  await writeDeviceInfoToDynamo(deviceId, 'snr', snr);
  await writeDeviceInfoToDynamo(deviceId, 'link_type', linkType);
}; 