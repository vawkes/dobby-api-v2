import { sendToDobby } from './send-to-dobby';

export const sendAck = async (deviceId: string, ackType: number, messageNumber: number): Promise<void> => {
  try {
    // Create buffer and DataView for 3 bytes
    const buffer = Buffer.alloc(3);
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    // Write bytes in big-endian format
    view.setUint8(0, 13);  // ACK message type
    view.setUint8(1, ackType);
    view.setUint8(2, messageNumber);

    await sendToDobby(deviceId, buffer);
  } catch (error) {
    console.error('Error sending ACK:', error);
    throw error;
  }
}; 