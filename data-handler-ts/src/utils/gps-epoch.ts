// GPS epoch started on January 6, 1980
const GPS_EPOCH_START = new Date('1980-01-06T00:00:00.000Z').getTime() / 1000;

export const convertFromGpsEpoch = (gpsTimestamp: number): number => {
  return gpsTimestamp + GPS_EPOCH_START;
}; 