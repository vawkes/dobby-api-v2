import { writeDeviceInfoToDynamo } from '../utils/dynamo';

export const handleFwVersion = async (payload: Buffer, deviceId: string): Promise<void> => {
  const fwVersion = payload.slice(1).toString('utf8').trim();
  console.log(`Firmware Version: ${fwVersion}`);
  await writeDeviceInfoToDynamo(deviceId, 'fw_version', fwVersion);
}; 