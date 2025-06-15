import { writeDeviceInfoToDynamo } from '../utils/dynamo';

export const handleGridcubeFwVersion = async (payload: Buffer, deviceId: string): Promise<void> => {
  const fwVersion = payload.slice(1).toString('utf8').trim();
  console.log(`GridCube Firmware Version: ${fwVersion}`);
  await writeDeviceInfoToDynamo(deviceId, 'gridcube_fw_version', fwVersion);
}; 