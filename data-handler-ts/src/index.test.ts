import { jest, describe, beforeEach, it, expect } from '@jest/globals';

jest.mock('./utils/signal-data', () => ({
  writeSignalDataToDynamo: jest.fn(),
}));

jest.mock('./utils/dynamo', () => ({
  writeDobbyDataToDynamo: jest.fn(),
  writeDeviceInfoToDynamo: jest.fn(),
}));

jest.mock('./packet-handlers/gridcube-fw-version', () => ({
  handleGridcubeFwVersion: jest.fn(),
}));

import { handler } from './index';
import { writeSignalDataToDynamo } from './utils/signal-data';

const mockedWriteSignalDataToDynamo = jest.mocked(writeSignalDataToDynamo);

const payloadData = (hexPayload: string): string => Buffer.from(hexPayload).toString('base64');

describe('handler signal data writes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedWriteSignalDataToDynamo.mockResolvedValue();
  });

  it('writes one combined signal row for connection info with Sidewalk RSSI', async () => {
    await handler({
      WirelessDeviceId: 'wireless-device-1',
      PayloadData: payloadData('07b90900000002'),
      WirelessMetadata: { Sidewalk: { Rssi: -22 } },
    });

    expect(mockedWriteSignalDataToDynamo).toHaveBeenCalledTimes(1);
    expect(mockedWriteSignalDataToDynamo).toHaveBeenCalledWith('wireless-device-1', {
      source_packet_type: 7,
      sidewalk_rssi: -22,
      rssi: -71,
      snr: 9,
      link_type: 2,
    });
  });

  it('writes a Sidewalk-only signal row for non-connection packets with Sidewalk RSSI', async () => {
    await handler({
      WirelessDeviceId: 'wireless-device-1',
      PayloadData: payloadData('08'),
      WirelessMetadata: { Sidewalk: { Rssi: -30 } },
    });

    expect(mockedWriteSignalDataToDynamo).toHaveBeenCalledTimes(1);
    expect(mockedWriteSignalDataToDynamo).toHaveBeenCalledWith('wireless-device-1', {
      source_packet_type: 8,
      sidewalk_rssi: -30,
    });
  });

  it('does not write a signal row when no signal fields are present', async () => {
    await handler({
      WirelessDeviceId: 'wireless-device-1',
      PayloadData: payloadData('08'),
      WirelessMetadata: { Sidewalk: {} },
    });

    expect(mockedWriteSignalDataToDynamo).not.toHaveBeenCalled();
  });
});
