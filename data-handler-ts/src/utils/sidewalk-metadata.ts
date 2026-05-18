import { writeDeviceInfoToDynamo } from './dynamo';

export interface SidewalkMetadataEvent {
  WirelessMetadata?: {
    Sidewalk?: {
      Rssi?: number;
    };
  };
}

export const getSidewalkRssi = (event: SidewalkMetadataEvent): number | undefined => {
  const rssi = event.WirelessMetadata?.Sidewalk?.Rssi;
  return typeof rssi === 'number' && Number.isFinite(rssi) ? rssi : undefined;
};

export const writeSidewalkMetadataToDynamo = async (
  deviceId: string,
  event: SidewalkMetadataEvent
): Promise<void> => {
  const sidewalkRssi = getSidewalkRssi(event);
  if (sidewalkRssi === undefined) {
    return;
  }

  await writeDeviceInfoToDynamo(deviceId, 'sidewalk_rssi', sidewalkRssi);
};
