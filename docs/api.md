# API Documentation

## Base URL
`http://localhost:3000/api/v1`

## Endpoints

### GET `/health`
Check if the backend is running.

### POST `/sos`
Receive a new SOS message from the gateway.

### GET `/sos`
Get all active SOS alerts.

### GET `/sos/:messageId`
Get a specific SOS message by ID.

### PATCH `/sos/:messageId/status`
Update the rescue status of a victim.

### GET `/victims`
Get all registered victims.

## Mesh API Endpoints (New for Offline Sim)

### POST `/mesh/send`
Receive a new SOS message directly from the mesh gateway. Invokes the AI severity classifier.
**Payload:**
```json
{
  "messageId": "string",
  "victimId": "string",
  "latitude": 28.1,
  "longitude": 77.1,
  "emergencyType": "EARTHQUAKE",
  "description": "trapped under building",
  "num_victims": 3,
  "is_trapped": true,
  "is_injured": true,
  "is_fire": false,
  "ttl": 4,
  "hopCount": 3
}
```

### POST `/mesh/relay`
Record a node-to-node relay event (used to trace the route).
**Payload:**
```json
{
  "messageId": "string",
  "sourceNode": "Node-A",
  "currentNode": "Node-B",
  "nextNode": "Node-C",
  "ttl": 3,
  "hopCount": 1
}
```

### GET `/mesh/routes`
Get the hop-by-hop history of all relayed messages.

### POST `/mesh/simulate`
Triggers the backend to run the local Python mesh simulation script to demonstrate offline SOS routing for the hackathon demo.
