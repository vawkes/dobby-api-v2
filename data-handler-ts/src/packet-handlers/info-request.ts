import { writeDeviceInfoToDynamo } from '../utils/dynamo';

export const handleInfoRequest = async (payload: Buffer, deviceId: string): Promise<void> => {
  const ctaVersion = payload[1];
  const vendorId = payload.readUInt16BE(3);
  const deviceType = payload.readUInt16BE(5);
  const deviceRevision = payload.readUInt16BE(7);
  const capabilityBitmap = payload.readUInt32BE(9);

  console.log(`CTA Version: ${String.fromCharCode(ctaVersion)}`);
  console.log(`Vendor ID: ${vendorId}`);
  console.log(`Device Type: ${deviceType}`);
  console.log(`Device Revision: ${deviceRevision}`);
  console.log(`Capability Bitmap: ${capabilityBitmap}`);

  await writeDeviceInfoToDynamo(deviceId, 'cta_version', String.fromCharCode(ctaVersion));
  await writeDeviceInfoToDynamo(deviceId, 'vendor_id', vendorId);
  await writeDeviceInfoToDynamo(deviceId, 'device_type', deviceType);
  await writeDeviceInfoToDynamo(deviceId, 'device_revision', deviceRevision);
  await writeDeviceInfoToDynamo(deviceId, 'capability_bitmap', capabilityBitmap);
}; 