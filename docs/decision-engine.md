# AI Decision & Dispatch Recommendation Engine

Phase 6 of ResQ-Logix introduces the operational decision layer. **Phase 6 is a decision and optimization layer, not another machine-learning model.** It combines Phase 4 Accessibility and Phase 5 Priority intelligence with logistics context to recommend a feasible warehouse and vehicle for an emergency request.

## 1. Overall Architecture
```
Logistics Backend (Future /logistics/ai-context)
       |
       v
LogisticsContextAdapter
       |
       v
Phase 4 Accessibility ML
       |
       v
Phase 5 Priority ML
       |
       v
Decision Engine
       |
       v
Recommendation
       |
       v
Human Approval
```

## 2. Inputs & Logistics Adapter
The `LogisticsContextAdapter` parses the prototype `logistics_context_demo.json` payload (which mimics the future live API). It validates data, calculates `available_quantity` from reserved stock, and rejects invalid negative values.

## 3. Feasibility Logic (Hard Constraints)
The Decision Engine enforces strict operational feasibility before ranking.
- **Warehouse Feasibility**: Must be `ACTIVE` and have sufficient `available_quantity` of the requested resource.
- **Vehicle Feasibility**: Must be `AVAILABLE`, active, have sufficient capacity, sufficient fuel for the estimated geographic distance, and possess terrain capability suitable for the Accessibility Risk score (e.g. `STANDARD` vehicles are rejected for `HIGH` risk routes).

## 4. Ranking & Route Analysis
Feasible entities are ranked using:
- **Haversine Distance**: Straight-line geographic distance calculation. *Note: Prototype uses geographic distance rather than true road routing.*
- **Vehicle Score**: Minimizes total distance (Vehicle -> Warehouse -> Destination), with capability bonuses (e.g., medical vehicles for medical emergencies).
- **Decision Score**: An overall 0-100 metric combining Priority Score, Accessibility, and Logistics Feasibility Efficiency.

## 5. Explainability & Human Approval
The final JSON recommendation explicitly lists the **reasons** why a pairing was chosen and any route **warnings** (e.g., "Critical route accessibility"). 
The system does **NOT** automatically dispatch resources. The recommendation is presented for a human dispatcher's approval.

## 6. Failure Handling
If constraints fail, the engine explicitly returns `NO_FEASIBLE_VEHICLE`, `NO_FEASIBLE_WAREHOUSE`, or `NO_FEASIBLE_SOLUTION` with clear reasons, rather than attempting to guess a solution.

## 7. Current Limitations & Future Integration
- **Routing**: No full road-level routing yet. Relies on Haversine distance and Phase 4 risk heuristics.
- **Data**: Uses synthetic demo logistics data.
- **Future Plan**: Will connect to the live `GET /logistics/ai-context` endpoint on the `logistics` branch once available.
