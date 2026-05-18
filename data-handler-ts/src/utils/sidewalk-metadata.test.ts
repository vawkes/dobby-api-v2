import { writeSidewalkMetadataToDynamo } from './sidewalk-metadata';
import { writeDeviceInfoToDynamo } from './dynamo';

jest.mock('./dynamo', () => ({
  writeDeviceInfoToDynamo: jest.fn(),
}));

const mockedWriteDeviceInfoToDynamo = jest.mocked(writeDeviceInfoToDynamo);

describe('writeSidewalkMetadataToDynamo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores Sidewalk RSSI metadata separately from device RSSI', async () => {
    await writeSidewalkMetadataToDynamo('wireless-device-1', {
      WirelessMetadata: {
        Sidewalk: {
          Rssi: -22,
        },
      },
    });

    expect(mockedWriteDeviceInfoToDynamo).toHaveBeenCalledWith(
      'wireless-device-1',
      'sidewalk_rssi',
      -22
    );
  });

  it('does not write when Sidewalk RSSI metadata is absent', async () => {
    await writeSidewalkMetadataToDynamo('wireless-device-1', {
      WirelessMetadata: {
        Sidewalk: {},
      },
    });

    expect(mockedWriteDeviceInfoToDynamo).not.toHaveBeenCalled();
  });
});
