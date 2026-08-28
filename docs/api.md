# API Documentation

## Base URL
`http://localhost:3000/api/v1`

---

## 1. System & SOS Endpoints

### GET `/health`
Check if the backend is running.

### POST `/sos`
Receive a new SOS message from the gateway.

### GET `/sos`
Get all active SOS alerts.

### GET `/sos/:messageId`
Get a specific SOS message by ID.

### PATCH `/sos/:messageId/status`
Update the rescue status of a victim (`ACTIVE`, `ACKNOWLEDGED`, `RESCUED`, `CANCELLED`).

### GET `/victims`
Get all registered victims.

---

## 2. Mesh API Endpoints (Offline Simulation)

### POST `/mesh/send`
Receive a new SOS message directly from the mesh gateway. Invokes the AI severity classifier.
**Payload:**
```json
{
  "messageId": "string",
  "victimId": "string",
  "latitude": 25.1764,
  "longitude": 93.0177,
  "emergencyType": "LANDSLIDE_TRAPPED",
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
Triggers the backend to run the local Python mesh simulation script to demonstrate offline SOS routing for the demo.

---

## 3. Logistics Module Endpoints

### Vehicles Management

#### `GET /vehicles` (or `/api/v1/vehicles`)
Retrieve all vehicles.
- **Query Params (Optional):**
  - `status`: Filter by status (`AVAILABLE`, `ON_ROUTE`, `BUSY`, `MAINTENANCE`)
  - `vehicle_type`: Filter by vehicle type
  - `availability`: Filter by boolean availability flag (`1` or `0`)
- **Response `200 OK`:**
```json
{
  "status": "success",
  "count": 10,
  "data": [
    {
      "vehicle_id": "V001",
      "vehicle_type": "Ambulance",
      "capacity": 4,
      "capacity_unit": "persons",
      "current_latitude": 26.1445,
      "current_longitude": 91.7362,
      "current_location": "Guwahati, Assam",
      "status": "AVAILABLE",
      "fuel_level": 95,
      "availability": 1,
      "created_at": "2026-08-29T00:00:00.000Z",
      "updated_at": "2026-08-29T00:00:00.000Z"
    }
  ]
}
```

#### `GET /vehicles/:id`
Retrieve details of a specific vehicle.

#### `POST /vehicles`
Register a new relief vehicle.
- **Payload:**
```json
{
  "vehicle_id": "V-NER-01",
  "vehicle_type": "Supply Truck",
  "capacity": 6000,
  "capacity_unit": "kg",
  "current_latitude": 26.1445,
  "current_longitude": 91.7362,
  "current_location": "Guwahati Central Relief Hub",
  "status": "AVAILABLE",
  "fuel_level": 100,
  "availability": 1
}
```
- **Response `201 Created`**

#### `PATCH /vehicles/:id`
Update vehicle status, location, coordinates, capacity, or fuel level.
- **Payload:**
```json
{
  "status": "ON_ROUTE",
  "fuel_level": 85,
  "current_location": "En route to Haflong"
}
```
- **Response `200 OK`**

---

### Warehouses Management

#### `GET /warehouses` (or `/api/v1/warehouses`)
List all regional warehouses across Northeast India with aggregated inventory metrics.
- **Query Params (Optional):** `state`, `status`
- **Response `200 OK`:**
```json
{
  "status": "success",
  "count": 8,
  "data": [
    {
      "warehouse_id": "WH-GHY-01",
      "name": "Guwahati Central Relief Hub",
      "location": "Guwahati, Kamrup Metropolitan",
      "latitude": 26.1445,
      "longitude": 91.7362,
      "state": "Assam",
      "status": "OPERATIONAL",
      "resource_types_count": 6,
      "total_units_stocked": 20350
    }
  ]
}
```

#### `GET /warehouses/:id`
Retrieve warehouse details along with its itemized inventory breakdown.
- **Response `200 OK`:**
```json
{
  "status": "success",
  "data": {
    "warehouse_id": "WH-GHY-01",
    "name": "Guwahati Central Relief Hub",
    "location": "Guwahati, Kamrup Metropolitan",
    "latitude": 26.1445,
    "longitude": 91.7362,
    "state": "Assam",
    "status": "OPERATIONAL",
    "inventory": [
      {
        "resource_id": "RES-GHY-01",
        "warehouse_id": "WH-GHY-01",
        "resource_type": "Food",
        "quantity": 5000,
        "unit": "packets",
        "priority": "CRITICAL"
      }
    ]
  }
}
```

---

### Resources & Inventory Management

#### `GET /resources` (or `/api/v1/resources`)
List inventory records across all warehouses.
- **Query Params (Optional):** `warehouse_id`, `resource_type`, `priority`
- **Response `200 OK`**

#### `GET /resources/:id`
Get a specific resource inventory record.

#### `POST /resources`
Add new stock item to a warehouse.
- **Payload:**
```json
{
  "warehouse_id": "WH-GHY-01",
  "resource_type": "Medicine",
  "quantity": 500,
  "unit": "kits",
  "priority": "CRITICAL"
}
```
- **Response `201 Created`**

#### `PATCH /resources/:id`
Update stock quantity or priority level.
- **Payload:**
```json
{
  "quantity": 750,
  "priority": "HIGH"
}
```
- **Response `200 OK`**

---

### Logistics Delivery Requests

#### `GET /logistics/requests` (or `/api/v1/logistics/requests`)
List all delivery requests, ordered by priority (`CRITICAL` -> `HIGH` -> `MEDIUM` -> `LOW`).
- **Query Params (Optional):** `status`, `priority`
- **Response `200 OK`:**
```json
{
  "status": "success",
  "count": 8,
  "data": [
    {
      "request_id": "REQ-NER-001",
      "destination": "Haflong Relief Camp, Dima Hasao, Assam",
      "latitude": 25.1764,
      "longitude": 93.0177,
      "requested_resource": "Medicine",
      "quantity": 150,
      "unit": "kits",
      "priority": "CRITICAL",
      "status": "PENDING",
      "assigned_vehicle_id": null,
      "source_warehouse_id": null
    }
  ]
}
```

#### `GET /logistics/requests/:id`
Retrieve details of a specific delivery request.

#### `POST /logistics/requests`
Create a new relief delivery request.
- **Payload:**
```json
{
  "destination": "Village Relief Outpost, Champhai, Mizoram",
  "latitude": 23.4735,
  "longitude": 93.3274,
  "requested_resource": "Drinking Water",
  "quantity": 2500,
  "unit": "liters",
  "priority": "CRITICAL"
}
```
- **Response `201 Created`**

#### `PATCH /logistics/requests/:id`
Update delivery request status (`PENDING`, `ASSIGNED`, `IN_TRANSIT`, `DELIVERED`, `CANCELLED`), assign a vehicle, or associate a source warehouse.
- **Payload:**
```json
{
  "status": "IN_TRANSIT",
  "assigned_vehicle_id": "V002",
  "source_warehouse_id": "WH-SHL-02"
}
```
- **Response `200 OK`**

---

### Dashboard Summary & AI Preparation Interfaces

#### `GET /logistics/summary` (or `/api/v1/logistics/summary`)
Aggregated KPIs for the logistics operations ribbon:
- Vehicle status counts (`available`, `on_route`, `busy`, `maintenance`, `total`)
- Warehouses (`total`, `operational`)
- Request status counts (`pending`, `assigned`, `in_transit`, `active_deliveries`, `delivered`, `cancelled`, `critical`)
- Inventory breakdown (`total_categories`, `total_units`, `total_reserved_units`, `total_available_units`, `low_stock_items_count`, `low_stock_resources`)

#### `GET /logistics/ai-context` (or `/api/v1/logistics/ai-context`)
Clean, structured JSON context prepared for consumption by the future AI Decision Engine (for vehicle dispatching, warehouse supply allocation, and routing).
- Returns:
  - `vehicles` (fleet with capacity, location, status, fuel, availability)
  - `warehouses` (operational hubs with GPS coordinates)
  - `resources` (inventory with `total_quantity`, `reserved_quantity`, and `available_quantity`)
  - `requests` (demand queue sorted by urgency)

---

### Audit & Event History

#### `GET /logistics/events` (or `/api/v1/logistics/events`)
Retrieve chronological audit history for all logistics events.
- **Query Params (Optional):** `event_type`, `request_id`, `vehicle_id`, `limit`
- **Response `200 OK`:**
```json
{
  "status": "success",
  "count": 18,
  "data": [
    {
      "id": 1,
      "event_type": "INVENTORY_RESERVED",
      "request_id": "REQ-NER-003",
      "vehicle_id": "V002",
      "warehouse_id": "WH-SHL-02",
      "resource_id": "RES-SHL-01",
      "details": "Reserved 800 packets Food at Shillong Base",
      "timestamp": "2026-08-29T00:00:00.000Z"
    }
  ]
}
```

#### `GET /logistics/events/request/:requestId`
Retrieve complete event trace specifically for a single delivery request.

