import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import DeviceEvents from './DeviceEvents.tsx';
import { eventsAPI } from '../services/api';

jest.mock('../services/api', () => ({
  eventsAPI: {
    getEventsByDeviceId: jest.fn(),
  },
}));

const mockedEventsAPI = eventsAPI as jest.Mocked<typeof eventsAPI>;

beforeEach(() => {
  mockedEventsAPI.getEventsByDeviceId.mockReset();
});

test('renders malformed events with defensive diagnostics', async () => {
  mockedEventsAPI.getEventsByDeviceId.mockResolvedValue([
    {
      event_id: 'event-1',
      event_type: 'BAD_EVENT' as any,
      event_data: {
        device_id: '000001',
        start_time: 'not-a-date',
      },
      event_ack: undefined,
    },
  ]);

  render(<DeviceEvents deviceId="000001" />);

  await waitFor(() => expect(mockedEventsAPI.getEventsByDeviceId).toHaveBeenCalledWith('000001'));

  expect(await screen.findByText('Unknown Event (BAD_EVENT)')).toBeInTheDocument();
  expect(screen.getByText('event-1')).toBeInTheDocument();
  expect(screen.getByText('Unknown')).toBeInTheDocument();
  expect(screen.getByText('Unknown acknowledgement')).toBeInTheDocument();
  expect(screen.queryByText('Invalid Date')).not.toBeInTheDocument();
  expect(screen.queryByText('Pending')).not.toBeInTheDocument();
});
