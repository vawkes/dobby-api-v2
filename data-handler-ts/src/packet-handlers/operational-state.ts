import { writeDeviceInfoToDynamo } from '../utils/dynamo';

export const handleOperationalState = async (payload: Buffer, deviceId: string): Promise<void> => {
  const state = payload[1];
  console.log(`Operational State: ${state}`);
  await writeDeviceInfoToDynamo(deviceId, 'operational_state', state);
}; 