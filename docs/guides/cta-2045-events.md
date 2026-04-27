# CTA-2045 Events (GridCube API)

This guide documents how GridCube API event types map to CTA-2045 commands, with a focus on **Advanced Load Up**.

For the full cloud-to-firmware byte protocol, response packet map, and
implementation caveats, see
[`docs/protocols/gridcube-cta-2045-sidewalk.md`](../protocols/gridcube-cta-2045-sidewalk.md).

## Where To Send Commands

Use `POST /events` with an authenticated JWT bearer token. Choose the `event_type` and supply the matching `event_data`.

## Advanced Load Up (CTA-2045)

Send:

- `event_type`: `ADVANCED_LOAD_UP`
- `event_data` fields:
  - `device_id`: 6-digit ID (e.g. `"000012"`) or UUID (arrays supported for bulk)
  - `start_time`: ISO-8601 datetime string
  - `duration`: **minutes** (UInt16)
  - `value`: UInt16
    - `0` (0x0000): no effect (requires `units = 255`)
    - `1..65534` (0x0001..0xFFFE): minimum extra energy above normal = `value * units`
    - `65535` (0xFFFF): store as much as possible above normal (while maintaining safety/efficiency)
  - `units`: UInt8
    - `0`: 1 Wh
    - `1`: 10 Wh
    - `2`: 100 Wh
    - `3`: 1000 Wh (1 kWh)
    - `255` (0xFF): special (only allowed with `value=0` in SetAdvancedLoadUp; also used by GetAdvancedLoadUp to indicate inactive)
    - `4..254`: reserved (do not use; rejected by API)
  - `suggested_load_up_efficiency`: UInt8 (0-255, set `0` if unused)
  - `event_id`: UUID (CTA Event ID sent to the device; GridCube encodes the first 4 bytes)
  - `start_randomization`: minutes (UInt8)
  - `end_randomization`: minutes (UInt8)

### Example: minimum +3 kWh above normal

```json
{
  "event_id": "8d0b2c2e-2b8d-4d11-9f54-6d8c5d7b2a1f",
  "event_type": "ADVANCED_LOAD_UP",
  "event_data": {
    "device_id": "000012",
    "start_time": "2026-02-10T20:00:00Z",
    "duration": 120,
    "value": 3,
    "units": 3,
    "suggested_load_up_efficiency": 0,
    "event_id": "8d0b2c2e-2b8d-4d11-9f54-6d8c5d7b2a1f",
    "start_randomization": 0,
    "end_randomization": 0
  }
}
```

### Example: no-effect (capability check)

```json
{
  "event_id": "9d0b2c2e-2b8d-4d11-9f54-6d8c5d7b2a1f",
  "event_type": "ADVANCED_LOAD_UP",
  "event_data": {
    "device_id": "000012",
    "start_time": "2026-02-10T20:00:00Z",
    "duration": 15,
    "value": 0,
    "units": 255,
    "suggested_load_up_efficiency": 0,
    "event_id": "9d0b2c2e-2b8d-4d11-9f54-6d8c5d7b2a1f",
    "start_randomization": 0,
    "end_randomization": 0
  }
}
```

## Common Pitfalls

- `LOAD_UP.duration` is seconds, but `ADVANCED_LOAD_UP.duration` is minutes.
- Advanced Load Up requires `units` to be one of `0,1,2,3,255`; `4..254` are reserved.
- When `value=0`, `units` must be `255 (0xFF)`.
- The API request has a top-level `event_id`, but Advanced Load Up also has `event_data.event_id` for the CTA Event ID.
