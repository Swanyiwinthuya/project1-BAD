# CampusFix Peer API

CampusFix both exposes an API to a partner and consumes a partner API. Use two different API keys and store them in Azure Key Vault.

## Endpoint exposed by CampusFix

`POST https://project-1-backend.eastasia.cloudapp.azure.com/campusfix/api/peer/tickets`

Headers:

```http
Content-Type: application/json
x-api-key: KEY_ISSUED_BY_CAMPUSFIX
```

Body:

```json
{
  "externalReference": "EVENT-001",
  "requesterEmail": "organizer@university.edu",
  "requesterName": "Event Organizer",
  "title": "Projector failure",
  "description": "The projector stopped working during the event.",
  "room": "Room 402",
  "partnerName": "Campus Event Booking"
}
```

Success is HTTP `201`. Reusing the same `externalReference` is safe and returns the existing ticket with `duplicate: true`.

## Partner endpoint consumed by CampusFix

CampusFix expects:

```http
GET {CampusFix-PeerBaseUrl}/rooms/current?room=Room%20402
x-api-key: KEY_ISSUED_BY_PARTNER
```

Expected response:

```json
{
  "active": true,
  "event": {
    "name": "Database Systems Lecture",
    "startTime": "2026-08-03T09:00:00+07:00",
    "endTime": "2026-08-03T12:00:00+07:00"
  }
}
```

When `active` is `true`, the new ticket priority becomes `URGENT`. If the partner is unavailable, ticket creation continues normally.

