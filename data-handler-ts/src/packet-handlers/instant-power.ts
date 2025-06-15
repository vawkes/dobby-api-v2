import { convertFromGpsEpoch } from '../utils/gps-epoch';
import { writeShiftedDataToDynamo } from '../utils/dynamo';
import { sendToShifted } from '../utils/shifted';
import { sendAck } from '../utils/ack';

export const handleInstantPower = async (payload: Buffer, deviceId: string): Promise<void> => {
  const msgNumber = payload[1];
  const value = payload.readBigInt64LE(2);
  const gpsTimestamp = payload.readUInt32LE(8);
  const utcTimestamp = convertFromGpsEpoch(gpsTimestamp);

  await sendAck(deviceId, 0, msgNumber);

  console.log(`Instant Power: ${value} W`);
  console.log(`Message Number: ${msgNumber}`);
  console.log(`Timestamp: ${new Date(utcTimestamp * 1000).toISOString()}`);

  const rowEntry = await writeShiftedDataToDynamo(
    deviceId,
    utcTimestamp,
    msgNumber,
    'instant_power',
    value
  );
  await sendToShifted(rowEntry);
}; 