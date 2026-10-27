# CafeFlow

**CafeFlow** is a modern, QR-based cafe ordering and live order tracking web application built on the MERN stack (React + Vite + Tailwind CSS on the frontend, Node.js + Express + MongoDB + Socket.IO on the backend).

---

## 1. System Overview

CafeFlow provides two distinct workflows:
1. **Customer QR Journey**: Customers sit at a cafe table, scan the table QR code, browse the live digital menu, configure their cart with special instructions, place their order, and track real-time preparation progress on a live timeline. When the kitchen marks the order ready, the customer receives an instant audio/visual pickup notification and settles payment at the counter upon collection.
2. **Staff / Kitchen Live Dashboard**: Cafe staff and kitchen operators view an incoming order stream partitioned by status, advance orders through a strict state machine (`placed` -> `confirmed` -> `preparing` -> `ready` -> `completed`), update counter payment statuses, and manage menu availability in real time.

---

## 2. Repository Structure

```
cafeflow/
├── docs/                                # Living specifications & context
│   ├── PROJECT_CONTEXT.md               # High-level architecture & invariants
│   ├── API_CONTRACT.md                  # REST endpoint definitions & schemas
│   ├── DATA_MODEL.md                    # Mongoose schemas, enums & state graphs
│   ├── REALTIME_EVENTS.md               # Socket.IO rooms, events & security
│   ├── IMPLEMENTATION_STATUS.md         # Milestone progress & test verification
│   └── FRONTEND_INTEGRATION_GUIDE.md    # Integration patterns for frontend
├── server/                              # Node.js + Express + Socket.IO backend
│   ├── src/
│   │   ├── config/                      # Database & environment loaders
│   │   ├── constants/                   # Order/payment enums & transition tables
│   │   ├── controllers/                 # REST business logic
│   │   ├── middlewares/                 # Auth & error handling
│   │   ├── models/                      # Mongoose schemas (User, Table, Menu, Order)
│   │   ├── routes/                      # API routing (auth, menu, table, order, admin)
│   │   ├── sockets/                     # Socket.IO server & event handlers
│   │   ├── utils/                       # Pricing, token generators & seeder
│   │   ├── app.js                       # Express app configuration
│   │   └── server.js                    # HTTP + WebSocket entry point
│   ├── tests/                           # Unit & integration tests
│   ├── .env.example
│   └── package.json
├── AGENTS.md                            # Persistent guidelines & AI workflow rules
├── README.md                            # This file
├── .env.example                         # Root environment template
└── .gitignore                           # Git ignore rules
```

---

## 3. Quick Start & Local Development

### Prerequisites
- **Node.js**: v18+ (tested on Node v25.6.1)
- **MongoDB**: Local MongoDB instance running on port 27017 or a cloud connection URI

### Backend Setup
1. Navigate to the server directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment:
   ```bash
   cp .env.example .env
   ```
4. Seed demo data (creates default admin user, sample menu items, and 4 tables with QR tokens):
   ```bash
   npm run seed
   ```
   *Default Admin Credentials:*
   - **Email**: `admin@cafeflow.com`
   - **Password**: `Admin@123456`
   *Sample Table QR Tokens:*
   - Table 1: `qr_table_1_cafeflow`
   - Table 2: `qr_table_2_cafeflow`
   - Table 3: `qr_table_3_cafeflow`
   - Table 4: `qr_table_4_cafeflow`

5. Start the backend development server:
   ```bash
   npm run dev
   ```
   The backend will start on:
   - **REST API**: `http://localhost:5001/api/v1`
   - **Socket.IO**: `http://localhost:5001`
   - **Health Check**: `http://localhost:5001/api/v1/health`

---

## 4. Running Automated Tests

The backend includes a comprehensive automated test suite (unit tests and integration tests) utilizing `mongodb-memory-server` for complete database isolation.

Run all tests:
```bash
cd server
npm test
```
*Current verification: 6 test suites, 32 tests passing.*

---

## 5. Security & Invariants
- **Zero Client Trust on Pricing**: Subtotals, taxes, and total amounts are calculated on the server using active database prices at the moment of order placement.
- **Snapshot Immutability**: Order records capture name and unit price snapshots at creation time.
- **State Machine Rules**: Transitions from terminal states (`completed`, `cancelled`) or invalid jumps are rejected with `400 Bad Request`.
- **Customer Privacy**: Customer order tracking is secured via a random 32-byte cryptographic token (`customerTrackingToken`), preventing sequential ID harvesting.
- **Socket Room Isolation**: Socket.IO tracking rooms require the customer tracking token to join. Admin order feeds require a verified JWT.
