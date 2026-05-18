import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';

jest.mock('../../../shared/database/client', () => ({
  docClient: {
    send: jest.fn(),
  },
  TABLES: {
    DEVICE_SIGNAL_DATA: 'DobbySignalData',
  },
}));

import { docClient } from '../../../shared/database/client';
import { writeSignalDataToDynamo } from './signal-data';

const mockSend = docClient.send as unknown as jest.Mock;

describe('writeSignalDataToDynamo', () => {
  beforeEach(() => {
    mockSend.mockReset();
    mockSend.mockResolvedValue({} as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('writes signal values to DobbySignalData with a millisecond timestamp', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1770000000123);

    await writeSignalDataToDynamo('wireless-device-1', {
      source_packet_type: 7,
      sidewalk_rssi: -22,
      rssi: -71,
      snr: 9,
      link_type: 2,
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const command = mockSend.mock.calls[0][0] as { input: { TableName: string; Item: Record<string, unknown> } };
    expect(command.input).toEqual({
      TableName: 'DobbySignalData',
      Item: {
        device_id: 'wireless-device-1',
        timestamp: 1770000000123,
        source_packet_type: 7,
        sidewalk_rssi: -22,
        rssi: -71,
        snr: 9,
        link_type: 2,
      },
    });
  });

  it('does not write when no signal fields are present', async () => {
    await writeSignalDataToDynamo('wireless-device-1', { source_packet_type: 0 });

    expect(mockSend).not.toHaveBeenCalled();
  });
});
