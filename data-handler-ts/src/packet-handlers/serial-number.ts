import { writeDeviceInfoToDynamo } from '../utils/dynamo';

export const handleSerialNumber = async (payload: Buffer, deviceId: string): Promise<void> => {
  const serialNumber = payload.slice(1).toString('utf8').trim();
  console.log(`Serial Number: ${serialNumber}`);
  await writeDeviceInfoToDynamo(deviceId, 'serial_number', serialNumber);
}; 