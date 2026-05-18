import { describe, expect, it } from '@jest/globals';
import { deviceSchema } from '../lambda/devices/devicesSchema.ts';

describe('deviceSchema Sidewalk RSSI', () => {
    it('keeps Sidewalk RSSI separate from device-reported RSSI', () => {
        const result = deviceSchema.safeParse({
            device_id: '000012',
            last_rx_rssi: -70,
            last_sidewalk_rssi: -22,
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect((result.data as { last_sidewalk_rssi?: number }).last_sidewalk_rssi).toBe(-22);
            expect(result.data.last_rx_rssi).toBe(-70);
        }
    });
});
