// GPS epoch started on January 6, 1980
const GPS_EPOCH_START_MS = new Date('1980-01-06T00:00:00.000Z').getTime();

/**
 * Converts a GPS timestamp (seconds since 1980-01-06) to a JavaScript Date object.
 * @param gpsTimestampSeconds The GPS timestamp in seconds
 * @returns Date object
 */
export const convertFromGpsEpoch = (gpsTimestampSeconds: number): Date => {
    return new Date(GPS_EPOCH_START_MS + (gpsTimestampSeconds * 1000));
};

/**
 * Formats a GPS timestamp string or number into a localized date string.
 * Handles "0" as "Immediate".
 * @param dateValue The GPS timestamp (string or number) or ISO string
 * @returns Formatted date string
 */
export const formatGpsDate = (dateValue?: string | number): string => {
    if (!dateValue) return "Invalid Date";
    if (dateValue === "0" || dateValue === 0) return "Immediate";

    // Check if it looks like a GPS timestamp (numeric)
    const numericValue = Number(dateValue);
    
    if (!isNaN(numericValue)) {
        // It's a number (GPS timestamp in seconds)
        try {
            const date = convertFromGpsEpoch(numericValue);
            return date.toLocaleString();
        } catch (e) {
            return "Invalid Date";
        }
    }

    // Fallback for ISO strings if any
    try {
        const date = new Date(dateValue);
        return date.toLocaleString();
    } catch (e) {
        return "Invalid Date";
    }
};

/**
 * Helper to get a Date object from a potential GPS timestamp or ISO string
 */
export const getDateFromGpsOrIso = (dateValue?: string | number): Date | null => {
    if (!dateValue) return null;
    if (dateValue === "0" || dateValue === 0) return new Date(); // Treat "Immediate" as now for sorting? Or maybe handled separately.

    const numericValue = Number(dateValue);
    if (!isNaN(numericValue)) {
        return convertFromGpsEpoch(numericValue);
    }

    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? null : date;
};