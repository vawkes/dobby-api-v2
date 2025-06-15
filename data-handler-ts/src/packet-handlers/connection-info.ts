import { writeDeviceInfoToDynamo } from '../utils/dynamo';

export const handleConnectionInfo = async (payload: Buffer, deviceId: string): Promise<void> => {
  const signalStrength = payload[1];
  const connectionType = payload[2];
  
  console.log(`Signal Strength: ${signalStrength}`);
  console.log(`Connection Type: ${connectionType}`);
  
  await writeDeviceInfoToDynamo(deviceId, 'signal_strength', signalStrength);
  await writeDeviceInfoToDynamo(deviceId, 'connection_type', connectionType);
}; 