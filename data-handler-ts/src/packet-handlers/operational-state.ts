import { writeDeviceInfoToDynamo } from '../utils/dynamo';
// import { send_to_shifted } from '../utils/send_to_shifted';

export const handleOperationalState = async (payload: Buffer, deviceId: string): Promise<void> => {
  const messageNumber = payload[1];
  const state = payload[2];
  const gpsTimestamp = payload.readUInt32BE(3);

  console.log(`Message Number: ${messageNumber}`);
  console.log(`State: ${state}`);
  console.log(`GPS Timestamp: ${gpsTimestamp}`);

  const row_entry = {
    device_id: deviceId,
    timestamp: gpsTimestamp,
    state: state,
    message_number: messageNumber,
  };

  // send_to_shifted(row_entry);
}; 