import axios from 'axios';

export const sendAck = async (deviceId: string, ackType: number, messageNumber: number): Promise<void> => {
  try {
    await axios.post(process.env.ACK_API_ENDPOINT!, {
      device_id: deviceId,
      ack_type: ackType,
      message_number: messageNumber
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ACK_API_KEY}`
      }
    });
  } catch (error) {
    console.error('Error sending ACK:', error);
    throw error;
  }
}; 