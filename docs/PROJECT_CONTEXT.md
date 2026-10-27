# CafeFlow - Project Context & Architecture

> **Status:** Backend Implemented, Audited & Verified. Ready for Frontend Integration.

---

## 1. System Vision & Architecture

CafeFlow is a focused, single-cafe QR ordering and live tracking system built on the MERN stack.
- **Customer Flow**: Scan table QR -> Browse digital menu -> Build cart -> Submit order -> Live tracking on WebSocket timeline -> Audio/visual pickup chime -> Collect & pay at counter.
- **Admin/Kitchen Flow**: Authenticated staff portal -> Live incoming order feed via Socket.IO -> Order state progression (`placed` -> `confirmed` -> `preparing` -> `ready` -> `completed`) -> Counter payment settlement (`paid_counter`) -> Real-time item stock 86ing.

```
  ┌────────────────────────────────────────────────────────┐
  │                      Web Client                        │
  │  (Customer QR Flow & Staff/Kitchen Admin Dashboard)    │
  └───────────────────▲─────────────────▲──────────────────┘
                      │                 │
             REST API │                 │ Socket.IO
        (HTTP JSON)   │                 │ (WebSockets)
                      ▼                 ▼
  ┌────────────────────────────────────────────────────────┐
  │               CafeFlow Express Backend                 │
  │     (Controllers, State Machine, Sockets, Auth)        │
  └───────────────────────────┬────────────────────────────┘
                              │
                      Mongoose ODM
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │                    MongoDB Database                    │
  │       (Users, Tables, Categories, MenuItems, Orders)   │
  └────────────────└───────────────────────────────────────┘
```

---

## 2. Verified Architectural Invariants

1. **Server Calculation of Order Totals**: The client never calculates prices or totals. Subtotals, tax, and total amounts are calculated on the server using live database prices at order creation.
2. **Frozen Item Snapshots**: Each order line item stores a frozen snapshot (`name`, `unitPrice`, `subtotal`, `specialInstructions`) inside the `Order.items` subdocument array.
3. **Availability Enforcement**: Before order creation, the server validates `isAvailable === true` for every requested item, returning HTTP 400 (`ITEM_UNAVAILABLE`) if out of stock.
4. **Table Validation**: Orders require a valid, active `Table` found via `qrCodeToken`.
5. **Decoupled Order and Payment Statuses**:
   - `orderStatus`: `placed` -> `confirmed` -> `preparing` -> `ready` -> `completed` (or `cancelled`).
   - `paymentStatus`: `pending` -> `paid_counter` (or `refunded`).
6. **State Transition Protection**: Out-of-order jumps (e.g. `placed` -> `completed`) or changes to terminal orders (`completed`, `cancelled`) are rejected with HTTP 400 (`INVALID_STATUS_TRANSITION`).
7. **Customer Tracking Isolation**: Every order is issued a 32-byte cryptographic hex token (`customerTrackingToken`). Both the REST tracking route and Socket.IO room require this token.
8. **Admin Protection**: Admin REST endpoints (`/api/v1/admin/*`) and the `admin:orders` socket channel strictly require a valid Bearer JWT.

---

## 3. Directory Structure

```
cafeflow/
├── docs/                                # Synchronized documentation
│   ├── PROJECT_CONTEXT.md
│   ├── API_CONTRACT.md
│   ├── DATA_MODEL.md
│   ├── REALTIME_EVENTS.md
│   ├── IMPLEMENTATION_STATUS.md
│   └── FRONTEND_INTEGRATION_GUIDE.md
├── server/                              # Node.js Express & Socket.IO backend
│   ├── src/
│   │   ├── config/ (db.js, env.js)
│   │   ├── constants/ (orderStatus.js, paymentStatus.js)
│   │   ├── controllers/ (auth, category, menu, order, table)
│   │   ├── middlewares/ (authMiddleware, errorHandler)
│   │   ├── models/ (User, Table, Category, MenuItem, Order)
│   │   ├── routes/ (index, auth, category, menu, table, order, admin)
│   │   ├── sockets/ (index, orderSocket, socketEmitter)
│   │   ├── utils/ (apiResponse, generateTokens, priceCalculator, seed)
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/
│   │   ├── unit/ (orderStateMachine.test.js)
│   │   ├── integration/ (adminRoutes, auth, menu, orderPlacement, orderStatus)
│   │   └── setup.js
│   ├── .env.example
│   └── package.json
├── AGENTS.md                            # Agent instructions & rules
├── README.md                            # High level overview & start guide
├── .gitignore                           # Git ignore rules
└── .env.example                         # Root environment template
```

---

## 4. Local Development Environment

- **Backend Port**: `5001`
- **Frontend Port**: `5173`
- **MongoDB**: `mongodb://localhost:27017/cafeflow`
- **Environment Variables**:
  - `PORT=5001`
  - `NODE_ENV=development`
  - `CLIENT_ORIGIN=http://localhost:5173`
  - `MONGODB_URI=mongodb://localhost:27017/cafeflow`
  - `JWT_SECRET=super_secret_jwt_key_at_least_32_characters_long_cafeflow_2026`
  - `JWT_EXPIRES_IN=7d`
  - `TAX_RATE_PERCENTAGE=0.0`
