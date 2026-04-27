# GridCube CTA-2045 over Amazon Sidewalk Protocol

This is the canonical repo reference for the GridCube cloud-to-firmware
protocol used by the CTA-2045 UCM. Start here before changing event handlers,
uplink packet handlers, telemetry ACKs, or device protocol docs.

## Agent Quick Map

- Cloud API sends commands from `lambda/events/*` through
  `lambda/utils/sendToDobby.ts`.
- Scheduled watchdog commands originate in `lambda/watchdog/watchdog.ts` and
  related utilities.
- Device uplinks are decoded by `data-handler-ts/src/index.ts`, then routed to
  `data-handler-ts/src/packet-handlers/*`.
- Command IDs are centralized in `lambda/events/models/eventType.ts`.
- API request validation is in `lambda/events/eventsSchema.ts`.
- Advanced Load Up API usage examples live in
  `docs/guides/cta-2045-events.md`.

If a byte layout changes, update all of these together: API schema, event
handler, data handler or ACK handler, tests, OpenAPI examples, and this file.

## System Intent

GridCube is a cloud platform for a CTA-2045 UCM. The UCM communicates with the
cloud over Amazon Sidewalk and with the SGD over the CTA-2045 socket. The
firmware/cloud protocol is intentionally small: it acts like a cloud-controlled
pipe into CTA-2045 behavior without sending the full CTA-2045 serial PDU from
the API.

The cloud downlink payload starts with a GridCube command type byte. Firmware
translates that command intent into the CTA-2045 interaction with the SGD. Device
uplinks start with a GridCube response type byte and are decoded by the data
handler.

## CTA-2045 Context

Source material: ANSI/CTA-2045-B and the GridCube command/response table
provided with this repo documentation update. This repo does not include the
full ANSI/CTA PDF.

Important CTA-2045 concepts:

- UCM: Universal Communication Module. In GridCube, the Sidewalk-connected
  module.
- SGD: Smart Grid Device. The appliance or load behind the CTA-2045 socket.
- CTA-2045 defines the physical interface, serial framing, link ACK/NAK, and DR
  application messages between UCM and SGD.
- Basic DR application uses message type `0x08 0x01` and fixed-size messages
  with one-byte opcodes. GridCube commands such as Shed, End Shed, Critical
  Peak, Grid Emergency, Customer Override, Operational State, and Load Up map to
  this family.
- Intermediate DR application uses message type `0x08 0x02` and variable-length
  payloads. GridCube commands such as Info Request, Get/Set UTC Time, Commodity
  Read, Set Capability Bitmap, and Advanced Load Up map to this family.
- CTA-2045 serial multi-byte numeric fields are big-endian. Current GridCube
  cloud downlink handlers write most multi-byte fields little-endian because
  that is the firmware-facing payload contract. Do not change endianness from
  the standard alone; verify firmware first.
- CTA-2045 Basic DR event duration is nonlinear:
  `seconds = 2 * (duration_byte ^ 2)`. `0x00` means unknown duration and `0xFF`
  means longer than the one-byte field can represent.
- CTA-2045 security is above the link layer. In this system, cloud/API auth,
  AWS IoT Wireless permissions, and Amazon Sidewalk carry the security boundary.

## Transport Encoding

Downlink:

1. API validates `POST /events`.
2. `lambda/events/eventDispatcher.ts` selects a handler.
3. Handler builds a byte buffer.
4. `lambda/utils/sendToDobby.ts` base64-encodes the raw bytes.
5. AWS IoT Wireless `SendDataToWirelessDevice` sends the payload over Sidewalk
   using `CUSTOM_COMMAND_ID_NOTIFY` and ACK mode.

Uplink:

1. AWS invokes `data-handler-ts/src/index.ts`.
2. `PayloadData` is base64 decoded into an ASCII hex string.
3. The hex string is decoded into bytes.
4. Byte `0` selects the packet handler.
5. Parsed values are stored in DynamoDB via `data-handler-ts/src/utils/dynamo.ts`
   and some telemetry packets are ACKed back to the device.

## Time Fields

The protocol uses two time concepts. Keep them distinct.

- GridCube scheduled command start times are documented by firmware as GPS epoch
  seconds, with `0` meaning start immediately.
- CTA-2045 Intermediate DR UTC fields are seconds since `2000-01-01T00:00:00Z`.
  UTC offset fields are in 15-minute increments.

Current implementation notes:

- Most basic command handlers use `lambda/utils/convertGpsTime.ts`, which
  returns seconds since the GPS epoch start on `1980-01-06`, plus a default
  leap-second offset.
- `lambda/events/eventHandlers/advancedLoadUp.ts` uses seconds since
  `2000-01-01T00:00:00Z`, matching the CTA-2045 Advanced Load Up UTC field.
- `data-handler-ts/src/utils/gps-epoch.ts` converts telemetry timestamps from
  GPS seconds to Unix seconds before writing `DobbyData`.

## Downlink Commands

All commands begin with byte `0` as the command type.

| Type | Command | API event type / sender | Payload after byte 0 |
| --- | --- | --- | --- |
| `0` | Start Shed | `START_SHED` | bytes 1-4 start GPS epoch; byte 5 duration byte |
| `1` | End Shed | `END_SHED` | bytes 1-4 start GPS epoch |
| `2` | Critical Peak | `CRITICAL_PEAK` | bytes 1-4 start GPS epoch; byte 5 duration byte |
| `3` | Grid Emergency | `GRID_EMERGENCY` | bytes 1-4 start GPS epoch; byte 5 duration byte |
| `4` | Customer Override | `CUSTOMER_OVERRIDE` | byte 1: `0` no override, `1` override |
| `5` | Query Operational State | not exposed as API event today | no payload |
| `6` | Load Up | `LOAD_UP` | bytes 1-4 start GPS epoch; byte 5 duration byte |
| `7` | Commodity Read | not exposed as API event today | no payload |
| `8` | Info Request | `INFO_REQUEST` and watchdog helpers | no payload in firmware table |
| `9` | Set UTC Time | `SET_UTC_TIME` | bytes 1-4 UTC seconds since 2000-01-01; byte 5 signed UTC offset in quarter-hours; byte 6 DST offset in quarter-hours |
| `10` | Get Advanced Load Up | enum only today | no payload |
| `11` | Set Advanced Load Up | `ADVANCED_LOAD_UP` | bytes 1-2 duration minutes; bytes 3-4 value; byte 5 units; byte 6 suggested efficiency; bytes 7-10 event ID; bytes 11-14 UTC seconds since 2000-01-01; byte 15 start randomization minutes; byte 16 end randomization minutes |
| `12` | Start Telemetry Publish | `START_DATA_PUBLISH` | bytes 1-2 publish interval minutes |
| `13` | Message ACK | data handler ACK utility | byte 1 ACK type; byte 2 message number |
| `14` | Send Connection Information | `REQUEST_CONNECTION_INFO` and watchdog helpers | no payload |
| `15` | Send GridCube FW Version | not exposed as API event today | no payload |
| `16` | Set Bitmap | `SET_BITMAP` | byte 1 bit number; byte 2 set/unset (`1` or `0`) |
| `17` | Get UTC Time | `GET_UTC_TIME` | no payload |

### Duration Byte

Used by Start Shed, Critical Peak, Grid Emergency, and Load Up.

- Decode: `seconds = 2 * (byte_value ^ 2)` for `0x01` through `0xFE`.
- Encode: `byte_value = sqrt(seconds / 2)`.
- `0x00`: duration unknown.
- `0xFF`: duration longer than representable.

Current handlers do not clamp or round the encoded value. Verify firmware
expectations before sending durations that are not exactly representable.

### Advanced Load Up

CTA-2045 Advanced Load Up lets the SGD store more energy than Basic Load Up, if
the device supports it and any required safety controls are present. For water
heaters, this may mean storing thermal energy above the user set point under
safe operating limits.

Important fields:

- `duration`: UInt16 minutes.
- `value`: UInt16 target extra energy.
  - `0x0000`: no effect / capability check; `units` must be `0xFF`.
  - `0x0001..0xFFFE`: minimum extra energy above normal, in `value * units`.
  - `0xFFFF`: store as much as possible above normal while preserving safety and
    efficiency.
- `units`:
  - `0x00`: 1 Wh.
  - `0x01`: 10 Wh.
  - `0x02`: 100 Wh.
  - `0x03`: 1000 Wh / 1 kWh.
  - `0x04..0xFE`: reserved.
  - `0xFF`: inactive/no-effect special value.
- `event_id`: GridCube encodes the first 4 bytes of the UUID into the CTA event
  ID field.
- `start_randomization`: delays start by a random value up to this many minutes.
- `end_randomization`: extends duration by a random value up to this many
  minutes.

Capability bitmap bit `6` indicates Advanced Load Up support. The GridCube
`SET_BITMAP` command maps to the CTA-2045 Set Capability Bitmap concept.

## Uplink Responses

All responses begin with byte `0` as the response type.

| Type | Response | Handler | Payload after byte 0 |
| --- | --- | --- | --- |
| `0` | Instantaneous Rate | `packet-handlers/instant-power.ts` | byte 1 message number; bytes 2-7 48-bit instantaneous rate |
| `1` | Cumulative Amount | `packet-handlers/cumulative-energy.ts` | byte 1 message number; bytes 2-7 48-bit cumulative amount |
| `2` | Info Request Bulk | `packet-handlers/info-request.ts` | bytes 1-2 CTA-2045 version ASCII; bytes 3-4 vendor ID; bytes 5-6 device type; bytes 7-8 device revision; bytes 9-12 capability bitmap |
| `3` | Info Request Model Number | `packet-handlers/model-number.ts` | bytes 1-16 model number ASCII |
| `4` | Info Request Serial Number | `packet-handlers/serial-number.ts` | bytes 1-16 serial number ASCII |
| `5` | Info FW Version | `packet-handlers/fw-version.ts` | bytes 1-5 CTA firmware date/version in firmware table |
| `6` | Basic Operational State | `packet-handlers/operational-state.ts` | byte 1 message number; byte 2 operational state |
| `7` | Connection Information | `packet-handlers/connection-info.ts` | byte 1 last RX RSSI int8; byte 2 last RX SNR int8; bytes 3-6 last RX link type |
| `8` | GridCube FW Version | `packet-handlers/gridcube-fw-version.ts` | bytes 1-n firmware version string |
| `9` | Command ACK | `packet-handlers/event-acknowledgment.ts` | firmware table only defines response type; current parser expects event type and timestamp too |

Current telemetry handlers also expect a timestamp after the fields in the table:

- Instantaneous Rate reads bytes `8-11` as a big-endian GPS timestamp.
- Cumulative Amount reads bytes `8-11` as a big-endian GPS timestamp.
- Basic Operational State reads bytes `3-6` as a big-endian GPS timestamp.

## ACK Behavior

The data handler sends Message ACK command type `13` for telemetry that has a
message number:

- Instantaneous Rate: `data-handler-ts/src/packet-handlers/instant-power.ts`.
- Cumulative Amount: `data-handler-ts/src/packet-handlers/cumulative-energy.ts`.
- Basic Operational State:
  `data-handler-ts/src/packet-handlers/operational-state.ts`.

Firmware protocol table says ACK byte `1` maps as:

- `0`: Operational State.
- `1`: Cumulative.
- `2`: Instantaneous Rate.

Current implementation maps:

- Instantaneous Rate -> `0`.
- Cumulative -> `1`.
- Operational State -> `2`.

Verify the firmware contract before changing this. The docs preserve both the
intended table and the current code behavior so agents do not silently "fix" one
side without checking the device.

## Operational State Codes

CTA-2045 Basic DR operational state responses include these common state codes:

| Code | Meaning |
| --- | --- |
| `0` | Idle normal |
| `1` | Running normal |
| `2` | Running curtailed |
| `3` | Running heightened |
| `4` | Idle curtailed |
| `5` | SGD error condition |
| `6` | Idle heightened |
| `7` | Cycling on |
| `8` | Cycling off |
| `9` | Variable following |
| `10` | Variable not following |
| `11` | Idle, opted out |
| `12` | Running, opted out |
| `13` | Running, price stream |
| `14` | Idle, price stream |
| `126-255` | Manufacturer reserved |

Typical mapping:

- Shed, Critical Peak, Grid Emergency: running curtailed or idle curtailed.
- Load Up and Advanced Load Up: running heightened or idle heightened.
- Price Stream: running price stream or idle price stream.

## Commodity Read Notes

CTA-2045 Commodity Read exchanges instantaneous and cumulative commodity values.
The GridCube firmware table splits instantaneous and cumulative values into
response types `0` and `1`.

Common CTA commodity codes:

| Code | Commodity |
| --- | --- |
| `0` | Electricity consumed, W and Wh |
| `1` | Electricity produced, W and Wh |
| `2` | Natural gas, cubic feet per hour and cubic feet |
| `3` | Water, gallons per hour and gallons |
| `4` | Natural gas, cubic meters per hour and cubic meters |
| `5` | Water, liters per hour and liters |
| `6` | Total energy storage/take capacity, Wh |
| `7` | Present energy storage/take capacity, Wh |
| `8` | Rated max consumption level, W |
| `9` | Rated max production level, W |
| `10` | Advanced Load Up total energy storage/take capacity, Wh |
| `11` | Advanced Load Up present energy storage/take capacity, Wh |

The high bit of a commodity code indicates measured versus estimated in
CTA-2045. The current data handler stores telemetry by response type and does not
persist the commodity code.

## Known Implementation Deltas To Verify

These are not changed by this doc. They are here so future agents check firmware
before editing protocol code.

- `START_SHED` allocates seven bytes but writes bytes `0-5`; the firmware table
  defines six bytes.
- `CRITICAL_PEAK` and `GRID_EMERGENCY` firmware tables include a duration byte,
  but current API schemas and handlers do not expose or send duration.
- `INFO_REQUEST` firmware table defines only command byte `0`, but
  `lambda/events/eventHandlers/infoRequest.ts` and
  `lambda/utils/sendInfoRequest.ts` also send a timestamp.
- `EventMap.END_DATA_PUBLISH = 13` conflicts with the firmware table name
  "Message ACK"; no public API event currently sends command type `13`.
- `FW Version` response type `5` is defined as year/month/day/major/minor in the
  firmware table, but `fw-version.ts` currently parses bytes `1-n` as a UTF-8
  string.
- Command ACK response type `9` is defined as only a response type in the
  firmware table, but `event-acknowledgment.ts` currently expects byte `1` event
  type and bytes `2-5` timestamp.
- Downlink command multi-byte fields are mostly little-endian. CTA-2045 serial
  fields are big-endian. Treat GridCube cloud payloads as their own firmware
  contract.

## Change Checklist

When adding or changing a command or response:

1. Update `lambda/events/models/eventType.ts`.
2. Update `lambda/events/eventsSchema.ts` and OpenAPI examples if exposed by API.
3. Update or add `lambda/events/eventHandlers/*`.
4. Update dispatch in `lambda/events/eventDispatcher.ts`.
5. Update `data-handler-ts/src/index.ts` and packet handlers for uplinks.
6. Update ACK behavior in `data-handler-ts/src/utils/ack.ts` if the message is
   numbered.
7. Add targeted tests for byte layout and parser behavior.
8. Update this file and any focused guide in `docs/guides/`.
