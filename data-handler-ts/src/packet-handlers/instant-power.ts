import { writeToTimestream } from '../utils/timestream.ts';
import { convertFromGpsEpoch } from '../utils/gps-epoch.ts';
import { writeShiftedDataToDynamo } from '../utils/dynamo.ts';
import { sendToShifted } from '../utils/shifted.ts';
import { sendAck } from '../utils/ack.ts';
import { Buffer } from 'node:buffer';

export const handleInstantPower = async (payload: Buffer, deviceId: string): Promise<void> => {
  const msgNumber = payload.readUInt8(1);
  const value = payload.readBigInt64BE(2);
  const gpsTimestamp = payload.readUInt32BE(8);
  const utcTimestamp = convertFromGpsEpoch(gpsTimestamp);

  await sendAck(deviceId, 2, msgNumber);

  console.log(`Instant Power: ${value} W`);
  console.log(`Message Number: ${msgNumber}`);
  console.log(`Timestamp: ${new Date(utcTimestamp * 1000).toISOString()}`);

  const timestreamRecords = [
    {
      MeasureName: 'instant_power',
      MeasureValue: value.toString(),
      MeasureValueType: 'BIGINT',
    }
  ];

  await writeToTimestream(deviceId, utcTimestamp, timestreamRecords);
  const rowEntry = await writeShiftedDataToDynamo(
    deviceId,
    utcTimestamp,
    msgNumber,
    'instant_power',
    value
  );
  await sendToShifted(rowEntry);
}; 