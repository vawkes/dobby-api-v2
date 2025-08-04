import { convertFromGpsEpoch } from '../utils/gps-epoch';
import { writeDobbyDataToDynamo } from '../utils/dynamo';
import { sendToShiftedIfComplete } from '../utils/shifted-validator';
import { sendAck } from '../utils/ack';

export const handleInstantPower = async (payload: Buffer, deviceId: string): Promise<void> => {
  const msgNumber = payload[1];
  // Read 48-bit value (6 bytes) starting at offset 2
  const value = BigInt(payload.readUIntBE(2, 6));
  const gpsTimestamp = payload.readUInt32BE(8);
  const utcTimestamp = convertFromGpsEpoch(gpsTimestamp);

  await sendAck(deviceId, 0, msgNumber);

  console.log(`Instant Power: ${value} W`);
  console.log(`Message Number: ${msgNumber}`);
  console.log(`Timestamp: ${new Date(utcTimestamp * 1000).toISOString()}`);

  const rowEntry = await writeDobbyDataToDynamo(
    deviceId,
    utcTimestamp,
    msgNumber,
    'instant_power',
    value
  );
  
  // Check if we have a complete payload for the new validator
  await sendToShiftedIfComplete(rowEntry);
}; 