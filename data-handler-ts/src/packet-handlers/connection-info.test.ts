import { jest, describe, beforeEach, it, expect } from '@jest/globals';

jest.mock('../utils/dynamo', () => ({
  writeDeviceInfoToDynamo: jest.fn(),
}));

import { writeDeviceInfoToDynamo } from '../utils/dynamo';
import { handleConnectionInfo, parseConnectionInfoSignalData } from './connection-info';

const mockedWriteDeviceInfoToDynamo = jest.mocked(writeDeviceInfoToDynamo);

describe('parseConnectionInfoSignalData', () => {
  it('parses connection signal data from packet type 7', () => {
    const payload = Buffer.from([7, 0xb9, 0x09, 0x00, 0x00, 0x00, 0x02]);

    expect(parseConnectionInfoSignalData(payload)).toEqual({
      rssi: -71,
      snr: 9,
      link_type: 2,
    });
  });
});

describe('handleConnectionInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedWriteDeviceInfoToDynamo.mockResolvedValue();
  });

  it('keeps writing last-known connection info to DobbyInfo', async () => {
    await handleConnectionInfo(
      Buffer.from([7, 0xb9, 0x09, 0x00, 0x00, 0x00, 0x02]),
      'device-1'
    );

    expect(mockedWriteDeviceInfoToDynamo).toHaveBeenCalledWith('device-1', 'rssi', -71);
    expect(mockedWriteDeviceInfoToDynamo).toHaveBeenCalledWith('device-1', 'snr', 9);
    expect(mockedWriteDeviceInfoToDynamo).toHaveBeenCalledWith('device-1', 'link_type', 2);
  });
});
