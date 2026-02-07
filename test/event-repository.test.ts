import { beforeEach, describe, expect, it, jest } from '@jest/globals'

jest.mock('../shared/database/client', () => ({
  docClient: {
    send: jest.fn()
  },
  TABLES: {
    EVENTS: 'DobbyEvent'
  }
}))

import { docClient } from '../shared/database/client'
import { EventType } from '../lambda/events/eventsSchema'
import { EventRepository } from '../shared/database/repositories/event-repository'

const mockSend = docClient.send as unknown as jest.Mock

describe('EventRepository.saveEvent', () => {
  let repository: EventRepository

  beforeEach(() => {
    repository = new EventRepository()
    mockSend.mockReset()
    mockSend.mockResolvedValue({} as never)
  })

  it('persists provided GPS start_time directly', async () => {
    await repository.saveEvent({
      event_id: 'event-1',
      event_type: EventType.INFO_REQUEST,
      event_data: {
        device_id: 'device-1',
        start_time: 12345,
        event_sent: true
      }
    })

    const command = mockSend.mock.calls[0][0] as { input: { Item: { timestamp: number } } }
    expect(command.input.Item.timestamp).toBe(12345)
  })

  it('falls back to current GPS timestamp when time fields are missing', async () => {
    await repository.saveEvent({
      event_id: 'event-2',
      event_type: EventType.INFO_REQUEST,
      event_data: {
        device_id: 'device-2',
        event_sent: true
      }
    })

    const command = mockSend.mock.calls[0][0] as { input: { Item: { timestamp: number } } }
    expect(command.input.Item.timestamp).toBeGreaterThan(0)
  })
})
