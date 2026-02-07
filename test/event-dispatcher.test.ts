import { beforeEach, describe, expect, it, jest } from '@jest/globals'

jest.mock('../lambda/events/eventHandlers/loadUp.ts', () => ({ handleLoadUp: jest.fn() }))
jest.mock('../lambda/events/eventHandlers/startShed.ts', () => ({ handleStartShed: jest.fn() }))
jest.mock('../lambda/events/eventHandlers/endShed.ts', () => ({ handleEndShed: jest.fn() }))
jest.mock('../lambda/events/eventHandlers/gridEmergency.ts', () => ({ handleGridEmergency: jest.fn() }))
jest.mock('../lambda/events/eventHandlers/criticalPeak.ts', () => ({ handleCriticalPeak: jest.fn() }))
jest.mock('../lambda/events/eventHandlers/customerOverride.ts', () => ({ handleCustomerOverride: jest.fn() }))
jest.mock('../lambda/events/eventHandlers/advancedLoadUp.ts', () => ({ handleAdvancedLoadUp: jest.fn() }))
jest.mock('../lambda/events/eventHandlers/infoRequest.ts', () => ({ handleInfoRequest: jest.fn() }))
jest.mock('../lambda/events/eventHandlers/requestConnectionInfo.ts', () => ({ handleRequestConnectionInfo: jest.fn() }))
jest.mock('../lambda/events/eventHandlers/setBitmap.ts', () => ({ handleSetBitmap: jest.fn() }))
jest.mock('../lambda/events/eventHandlers/setUtcTime.ts', () => ({ handleSetUtcTime: jest.fn() }))
jest.mock('../lambda/events/eventHandlers/getUtcTime.ts', () => ({ handleGetUtcTime: jest.fn() }))
jest.mock('../lambda/events/eventHandlers/startDataPublish.ts', () => ({ handleStartDataPublish: jest.fn() }))

import { EventType } from '../lambda/events/eventsSchema.ts'
import { dispatchEventToDevice } from '../lambda/events/eventDispatcher.ts'
import { handleStartDataPublish } from '../lambda/events/eventHandlers/startDataPublish.ts'
import { handleRequestConnectionInfo } from '../lambda/events/eventHandlers/requestConnectionInfo.ts'

const mockHandleStartDataPublish = handleStartDataPublish as jest.MockedFunction<typeof handleStartDataPublish>
const mockHandleRequestConnectionInfo = handleRequestConnectionInfo as jest.MockedFunction<typeof handleRequestConnectionInfo>

describe('dispatchEventToDevice', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('dispatches START_DATA_PUBLISH through the dedicated handler', async () => {
    const mockedEvent = {
      event_id: 'event-1',
      event_type: EventType.START_DATA_PUBLISH,
      event_data: { device_id: 'wireless-device-id', interval_minutes: 5, event_sent: true }
    }
    mockHandleStartDataPublish.mockResolvedValue(mockedEvent)

    const result = await dispatchEventToDevice(
      EventType.START_DATA_PUBLISH,
      { device_id: '000012', interval_minutes: 5 },
      'wireless-device-id'
    )

    expect(mockHandleStartDataPublish).toHaveBeenCalledWith('wireless-device-id', 5)
    expect(result).toEqual(mockedEvent)
  })

  it('dispatches REQUEST_CONNECTION_INFO through the dedicated handler', async () => {
    const mockedEvent = {
      event_id: 'event-2',
      event_type: EventType.REQUEST_CONNECTION_INFO,
      event_data: { device_id: 'wireless-device-id', event_sent: true }
    }
    mockHandleRequestConnectionInfo.mockResolvedValue(mockedEvent)

    const result = await dispatchEventToDevice(
      EventType.REQUEST_CONNECTION_INFO,
      { device_id: '000013' },
      'wireless-device-id'
    )

    expect(mockHandleRequestConnectionInfo).toHaveBeenCalledWith({
      device_id: 'wireless-device-id',
      event_sent: false
    })
    expect(result).toEqual(mockedEvent)
  })
})

