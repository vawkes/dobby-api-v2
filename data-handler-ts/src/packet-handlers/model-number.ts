import { writeDeviceInfoToDynamo } from '../utils/dynamo';

export const handleModelNumber = async (payload: Buffer, deviceId: string): Promise<void> => {
  const modelNumber = payload.slice(1).toString('utf8').trim();
  console.log(`Model Number: ${modelNumber}`);
  await writeDeviceInfoToDynamo(deviceId, 'model_number', modelNumber);
}; 