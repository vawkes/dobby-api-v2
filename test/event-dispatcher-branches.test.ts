import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { EventType } from '../lambda/events/eventsSchema.ts';
import { dispatchEventToDevice } from '../lambda/events/eventDispatcher.ts';
import { handleSetBitmap } from '../lambda/events/eventHandlers/setBitmap.ts';
import { handleRequestConnectionInfo } from '../lambda/events/eventHandlers/requestConnectionInfo.ts';
import { handleStartDataPublish } from '../lambda/events/eventHandlers/startDataPublish.ts';

jest.mock('../lambda/events/eventHandlers/loadUp.ts', () => ({ handleLoadUp: jest.fn() }));
jest.mock('../lambda/events/eventHandlers/startShed.ts', () => ({ handleStartShed: jest.fn() }));
jest.mock('../lambda/events/eventHandlers/endShed.ts', () => ({ handleEndShed: jest.fn() }));
jest.mock('../lambda/events/eventHandlers/gridEmergency.ts', () => ({ handleGridEmergency: jest.fn() }));
jest.mock('../lambda/events/eventHandlers/criticalPeak.ts', () => ({ handleCriticalPeak: jest.fn() }));
jest.mock('../lambda/events/eventHandlers/customerOverride.ts', () => ({ handleCustomerOverride: jest.fn() }));
jest.mock('../lambda/events/eventHandlers/advancedLoadUp.ts', () => ({ handleAdvancedLoadUp: jest.fn() }));
jest.mock('../lambda/events/eventHandlers/infoRequest.ts', () => ({ handleInfoRequest: jest.fn() }));
jest.mock('../lambda/events/eventHandlers/requestConnectionInfo.ts', () => ({ handleRequestConnectionInfo: jest.fn() }));
jest.mock('../lambda/events/eventHandlers/setBitmap.ts', () => ({ handleSetBitmap: jest.fn() }));
jest.mock('../lambda/events/eventHandlers/setUtcTime.ts', () => ({ handleSetUtcTime: jest.fn() }));
jest.mock('../lambda/events/eventHandlers/getUtcTime.ts', () => ({ handleGetUtcTime: jest.fn() }));
jest.mock('../lambda/events/eventHandlers/startDataPublish.ts', () => ({ handleStartDataPublish: jest.fn() }));

const mockHandleSetBitmap = handleSetBitmap as jest.Mock;
const mockHandleRequestConnectionInfo = handleRequestConnectionInfo as jest.Mock;
const mockHandleStartDataPublish = handleStartDataPublish as jest.Mock;

describe('dispatchEventToDevice branch handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null for an unsupported event type without calling handlers', async () => {
    const result = await dispatchEventToDevice(
      'UNKNOWN_EVENT' as EventType,
      { device_id: '123456' },
      '123456'
    );

    expect(result).toBeNull();
    expect(mockHandleSetBitmap).not.toHaveBeenCalled();
    expect(mockHandleRequestConnectionInfo).not.toHaveBeenCalled();
    expect(mockHandleStartDataPublish).not.toHaveBeenCalled();
  });

  it('defaults SET_BITMAP inputs when payload fields have the wrong type', async () => {
    mockHandleSetBitmap.mockResolvedValue({ event_type: EventType.SET_BITMAP } as never);

    await dispatchEventToDevice(
      EventType.SET_BITMAP,
      {
        device_id: '123456',
        bit_number: 'not-a-number',
        set_value: 'not-a-boolean',
      },
      '123456'
    );

    expect(mockHandleSetBitmap).toHaveBeenCalledWith({
      device_id: '123456',
      bit_number: 0,
      set_value: false,
    });
  });

  it('sets request-connection-info event_sent to false before dispatch', async () => {
    mockHandleRequestConnectionInfo.mockResolvedValue({
      event_type: EventType.REQUEST_CONNECTION_INFO,
    } as never);

    await dispatchEventToDevice(
      EventType.REQUEST_CONNECTION_INFO,
      { device_id: '123456', event_sent: true },
      '123456'
    );

    expect(mockHandleRequestConnectionInfo).toHaveBeenCalledWith({
      device_id: '123456',
      event_sent: false,
    });
  });

  it('defaults START_DATA_PUBLISH interval when it is missing', async () => {
    mockHandleStartDataPublish.mockResolvedValue({
      event_type: EventType.START_DATA_PUBLISH,
    } as never);

    await dispatchEventToDevice(
      EventType.START_DATA_PUBLISH,
      { device_id: '123456' },
      '123456'
    );

    expect(mockHandleStartDataPublish).toHaveBeenCalledWith('123456', 0);
  });
});
