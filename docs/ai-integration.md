# AI Integration Contract: Logistics Data Layer ↔ AI Decision Engine

This document defines the formal data contract between the **Logistics Management Module** and the future **AI Decision Engine / Intelligence Layer** in ResQ-Logix.

---

## 1. System Architecture & Information Flow

```
+-----------------------------------------------------------------------------------+
|                            RESQ-LOGIX DATA LAYER                                  |
|                                                                                   |
|  +--------------------+    +--------------------+    +--------------------+       |
|  |     Vehicles       |    |     Warehouses     |    | Delivery Demands   |       |
|  |  (Fleet Status &   |    | (Inventory, Stock  |    |  (Urgent Requests  |       |
|  |    GPS Bases)      |    |  & Reservations)   |    |    & Priority)     |       |
|  +---------+----------+    +---------+----------+    +---------+----------+       |
|            |                         |                         |                  |
+------------|-------------------------|-------------------------|------------------+
             |                         |                         |
             +-------------------------+-------------------------+
                                       |
                                       v
                     +-----------------------------------+
                     |     GET /logistics/ai-context     |
                     |  (Standardized Clean JSON Feed)   |
                     +-----------------+-----------------+
                                       |
                                       v
+-----------------------------------------------------------------------------------+
|                         FUTURE AI INTELLIGENCE LAYER                              |
|                         (Developed Independently)                                 |
|                                                                                   |
|  +-------------------------+                 +-------------------------+          |
|  |  Phase 4: Accessibility |                 |     Phase 5: Demand     |          |
|  |  Terrain Risk Evaluator |                 |   Priority Classifier   |          |
|  +------------+------------+                 +------------+------------+          |
|               |                                           |                       |
|               +---------------------+---------------------+                       |
|                                     |                                             |
|                                     v                                             |
|                     +-------------------------------+                             |
|                     |       AI DECISION ENGINE      |                             |
|                     |   (Optimal Triplet Matcher)   |                             |
|                     +---------------+---------------+                             |
+-------------------------------------|---------------------------------------------+
                                      |
                                      v
          [ Recommended: Vehicle (V_x) + Warehouse (WH_y) + Route (R_z) ]
                                      |
                                      v
+-----------------------------------------------------------------------------------+
|               DISPATCH EXECUTION & INVENTORY RESERVATION                          |
|             (PATCH /logistics/requests/:id -> ASSIGNED / IN_TRANSIT)              |
+-----------------------------------------------------------------------------------+
```

---

## 2. API Endpoint Specification

### `GET /api/v1/logistics/ai-context` (or `GET /logistics/ai-context`)

- **Method**: `GET`
- **Authentication**: None (Development/Local Prototype)
- **Response Format**: `application/json`
- **Guarantee**: Returns an un-opinionated, real-time snapshot of the entire logistics state. No ML models, heuristic filters, or fake predictions are injected into this endpoint.

---

## 3. Data Contract (JSON Response Schema)

```json
{
  "status": "success",
  "description": "Standardized data pipeline input for future AI Decision Engine (Resource Allocation & Route Recommendation)",
  "timestamp": "2026-08-29T00:25:00.000Z",
  "data": {
    "vehicles": [
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
        "availability": 1
      }
    ],
    "warehouses": [
      {
        "warehouse_id": "WH-GHY-01",
        "name": "Guwahati Central Relief Hub",
        "location": "Guwahati, Kamrup Metropolitan",
        "latitude": 26.1445,
        "longitude": 91.7362,
        "state": "Assam",
        "status": "OPERATIONAL"
      }
    ],
    "resources": [
      {
        "resource_id": "RES-GHY-01",
        "warehouse_id": "WH-GHY-01",
        "warehouse_name": "Guwahati Central Relief Hub",
        "resource_type": "Food",
        "total_quantity": 5000,
        "reserved_quantity": 0,
        "available_quantity": 5000,
        "unit": "packets",
        "priority": "CRITICAL"
      }
    ],
    "requests": [
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
}
```

---

## 4. Field Breakdown & Semantics for the AI Engine

### 4.1 Vehicles Collection (`data.vehicles`)
| Field | Type | Description / Usage for AI |
| :--- | :--- | :--- |
| `vehicle_id` | `string` | Unique vehicle identifier (e.g., `V001`). |
| `vehicle_type` | `string` | Type: `Ambulance`, `Supply Truck`, `Water Tanker`, `Rescue Vehicle`, `Van`. AI matches vehicle type to requested resource (e.g. Tanker for Water, Truck for Food/Blankets). |
| `capacity` | `number` | Maximum payload or passenger volume. |
| `capacity_unit` | `string` | Unit of measure (`kg`, `liters`, `persons`, `boxes`). |
| `current_latitude` | `number` | Current GPS latitude (-90.0 to 90.0). Used by AI distance matrix calculator. |
| `current_longitude` | `number` | Current GPS longitude (-180.0 to 180.0). |
| `current_location` | `string` | Human-readable location / base name. |
| `status` | `string` | `AVAILABLE`, `ON_ROUTE`, `BUSY`, `MAINTENANCE`. AI should filter for `AVAILABLE` fleet during dispatch matching. |
| `fuel_level` | `number` | Current fuel percentage (0 - 100). AI can penalize vehicles with low fuel for long-haul mountain routes. |
| `availability` | `integer` | Binary flag (`1` = ready, `0` = occupied). |

### 4.2 Warehouses Collection (`data.warehouses`)
| Field | Type | Description / Usage for AI |
| :--- | :--- | :--- |
| `warehouse_id` | `string` | Unique depot code (e.g., `WH-GHY-01`). |
| `name` | `string` | Regional facility name. |
| `location` | `string` | District / City name. |
| `latitude` | `number` | GPS latitude for origin routing. |
| `longitude` | `number` | GPS longitude for origin routing. |
| `state` | `string` | Northeast Indian state (Assam, Meghalaya, Manipur, Mizoram, Tripura, Nagaland, Arunachal Pradesh). |
| `status` | `string` | Operational state (`OPERATIONAL`, `OFFLINE`). |

### 4.3 Resources & Inventory Collection (`data.resources`)
| Field | Type | Description / Usage for AI |
| :--- | :--- | :--- |
| `resource_id` | `string` | Inventory stock record ID. |
| `warehouse_id` | `string` | Origin depot housing this inventory. |
| `resource_type` | `string` | Relief category: `Food`, `Drinking Water`, `Medicine`, `Emergency Kits`, `Blankets`, `Medical Supplies`. |
| `total_quantity` | `number` | Physical total stock in warehouse. |
| `reserved_quantity`| `number` | Stock committed to active assignments. |
| `available_quantity`| `number` | **Crucial for AI**: Net stock available for new allocation (`total_quantity - reserved_quantity`). AI must verify `available_quantity >= request.quantity`. |
| `unit` | `string` | `packets`, `liters`, `kits`, `boxes`, `units`. |
| `priority` | `string` | Base urgency rating: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`. |

### 4.4 Delivery Requests Collection (`data.requests`)
| Field | Type | Description / Usage for AI |
| :--- | :--- | :--- |
| `request_id` | `string` | Unique demand ID (e.g., `REQ-NER-001`). |
| `destination` | `string` | Destination name / refugee camp / village. |
| `latitude` | `number` | Destination GPS latitude. |
| `longitude` | `number` | Destination GPS longitude. |
| `requested_resource`| `string` | Required commodity type. |
| `quantity` | `number` | Amount demanded. |
| `unit` | `string` | Unit of demand. |
| `priority` | `string` | Urgency rank: `CRITICAL` > `HIGH` > `MEDIUM` > `LOW`. |
| `status` | `string` | `PENDING`, `ASSIGNED`, `IN_TRANSIT`, `DELIVERED`, `CANCELLED`. AI prioritizes optimizing unassigned `PENDING` demands. |
| `assigned_vehicle_id`| `string\|null` | Assigned vehicle ID (if allocated). |
| `source_warehouse_id`| `string\|null` | Source warehouse ID (if allocated). |

---

## 5. Decision Engine Execution Workflow (Recommendation to Dispatch)

When the AI Decision Engine determines an optimal allocation `(Request R, Vehicle V, Warehouse W)`:
1. The AI module issues an HTTP PATCH to assign the delivery:
   ```http
   PATCH /api/v1/logistics/requests/REQ-NER-001
   Content-Type: application/json

   {
     "status": "ASSIGNED",
     "assigned_vehicle_id": "V001",
     "source_warehouse_id": "WH-GHY-01"
   }
   ```
2. The Logistics backend automatically:
   - Verifies vehicle availability.
   - Validates that `WH-GHY-01` has sufficient `available_quantity`.
   - Reserves the required inventory quantity (`reserved_quantity += quantity`).
   - Marks the vehicle as `ON_ROUTE` (`availability = 0`).
   - Logs audit events to `logistics_events`.
   - Returns `200 OK` on success or `400 Bad Request` with exact failure context if inventory or vehicle state changed.
