const convertToGpsTimeEpoch = (utcTime: Date, leapSeconds: number = 18) => {
    const utcEpoch = Math.floor(utcTime.getTime() / 1000);
    const gpsEpoch = Math.floor(new Date(Date.UTC(1980, 0, 6)).getTime() / 1000);
    return utcEpoch - gpsEpoch + leapSeconds;
}

export { convertToGpsTimeEpoch };