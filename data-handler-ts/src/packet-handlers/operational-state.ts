import { convertFromGpsEpoch } from '../utils/gps-epoch';
import { writeDobbyDataToDynamo } from '../utils/dynamo';
import { sendToShifted } from '../utils/shifted';
import { sendAck } from '../utils/ack';

export const handleOperationalState = async (payload: Buffer, deviceId: string): Promise<void> => {
  const msgNumber = payload[1];
  const state = payload[2];
  const gpsTimestamp = payload.readUInt32BE(3);
  const utcTimestamp = convertFromGpsEpoch(gpsTimestamp);

  await sendAck(deviceId, 2, msgNumber);

  console.log(`Operational State: ${state}`);
  console.log(`Message Number: ${msgNumber}`);
  console.log(`Timestamp: ${new Date(utcTimestamp * 1000).toISOString()}`);

  const rowEntry = await writeDobbyDataToDynamo(
    deviceId,
    utcTimestamp,
    msgNumber,
    'operational_state',
    state
  );
  await sendToShifted(rowEntry);
}; 