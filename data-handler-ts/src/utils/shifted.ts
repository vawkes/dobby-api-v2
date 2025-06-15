import axios from 'axios';

interface ShiftedData {
  device_id: string;
  timestamp: number;
  message_number: number;
  data_type: string;
  value: bigint;
}

export const sendToShifted = async (data: ShiftedData): Promise<void> => {
  // try {
  //   await axios.post(process.env.SHIFTED_API_ENDPOINT!, data, {
  //     headers: {
  //       'Content-Type': 'application/json',
  //       'Authorization': `Bearer ${process.env.SHIFTED_API_KEY}`
  //     }
  //   });
  // } catch (error) {
  //   console.error('Error sending data to Shifted:', error);
  //   throw error;
  // }
  console.log("Sending to shifted disabled.")
  return
}; 