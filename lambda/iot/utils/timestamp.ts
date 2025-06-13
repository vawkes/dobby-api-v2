/**
 * Converts GPS epoch time to UTC time
 */
export function convertFromGpsEpoch(gpsTimestamp: number): number {
    // GPS time started on January 6, 1980, and doesn't include leap seconds
    const gpsEpochStart = new Date('1980-01-06T00:00:00Z').getTime() / 1000;
    return gpsEpochStart + gpsTimestamp;
} 