# Signal Data Time Series Design

## Goal

Track all signal-related telemetry as a time series so RSSI and SNR trends can be graphed and analyzed without being overwritten by the current last-known device info updates.

## Current Behavior

The data handler currently writes signal values into `DobbyInfo`:

- Connection info packets write `rssi`, `snr`, and `link_type`.
- Sidewalk uplink metadata writes `sidewalk_rssi`.

Those updates are last-known fields. They are useful for current status, but they lose history. `DobbyData` is not a good target for signal history because normal data rows are assembled from multiple packets at the same device timestamp, so per-packet signal fields would be overwritten or produce sparse mixed-purpose rows.

## Selected Approach

Create a new DynamoDB table, `DobbySignalData`, that stores one signal record per uplink signal observation.

Table keys:

- Partition key: `device_id`
- Sort key: `timestamp`

The timestamp is the Lambda receive time in epoch milliseconds. Millisecond precision keeps separate packets from overwriting each other under normal ingest rates and avoids depending on device packet timestamps that are not present on all uplinks.

## Record Shape

Each item contains:

- `device_id`: AWS IoT Wireless device ID.
- `timestamp`: epoch milliseconds when the data handler processed the uplink.
- `source_packet_type`: decoded payload type when available.
- `sidewalk_rssi`: AWS Sidewalk metadata RSSI when present.
- `rssi`: device-reported RSSI from connection info packets.
- `snr`: device-reported SNR from connection info packets.
- `link_type`: device-reported link type from connection info packets.

Fields are optional except `device_id` and `timestamp`, because not every packet contains every signal value.

## Data Flow

On every uplink:

1. Decode the payload enough to know `source_packet_type`.
2. Extract Sidewalk metadata RSSI if present.
3. If the packet is connection info (`source_packet_type` 7), parse device RSSI, SNR, and link type.
4. Write one `DobbySignalData` item if at least one signal field is present.
5. Continue updating `DobbyInfo` last-known fields for backwards compatibility with existing device lists and status views.

This keeps all signal data in one table while preserving existing API/frontend behavior.

## Infrastructure

CDK creates `DobbySignalData` with pay-per-request billing and `RETAIN` removal policy. The data handler Lambda receives read/write permissions for the new table.

The shared table constants include `DEVICE_SIGNAL_DATA` so application code avoids hard-coded table names.

## Testing

Add focused tests for:

- Connection info packets write `rssi`, `snr`, `link_type`, and `source_packet_type` to the signal table.
- Sidewalk metadata writes `sidewalk_rssi` to the signal table.
- Missing Sidewalk metadata does not create a signal row by itself.
- Existing `DobbyInfo` last-known writes still happen.

## Out of Scope

This change does not add graph APIs or frontend charts. It only persists the time-series data needed for those features.
