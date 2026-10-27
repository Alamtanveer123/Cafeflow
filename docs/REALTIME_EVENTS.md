# CafeFlow - Real-Time Socket.IO Specifications

> **Status:** Verified & Working. Synchronized with `/server/src/sockets/` implementation.

---

## 1. Socket.IO Server Configuration

- **Connection Endpoint**: `http://localhost:5001` (same as HTTP server)
- **CORS Allowed Origin**: Configured via `CLIENT_ORIGIN` (default: `http://localhost:5173`)
- **Transport**: WebSockets / HTTP long-polling

---

## 2. Room Authorization & Privacy Rules

### 2.1 Customer Order Rooms (`order:{orderId}`)
- **Security Check**: When a customer emits `order:join_tracking`, the backend queries MongoDB for `_id: orderId` and strictly compares the stored `customerTrackingToken` against the token sent in the payload.
- If tokens match: Socket joins `order:{orderId}` and receives `order:joined`.
- If mismatch or missing: Socket receives `tracking_error` and is **not** joined. This guarantees customers can never listen to orders from other tables.

### 2.2 Kitchen / Staff Room (`admin:orders`)
- **Security Check**: When a client emits `admin:join`, the backend verifies the JWT token with `jwt.verify(token, JWT_SECRET)` and verifies the user exists and is active.
- If verified: Socket joins `admin:orders` and receives `admin:joined`.
- If invalid or expired: Socket receives `admin:error` and access is denied.

---

## 3. Event Catalog

### 3.1 Client -> Server Events

#### `order:join_tracking`
- **Sender**: Customer client
- **Payload**:
```json
{
  "orderId": "64f1a2b3c4d5e6f7a8b9c0d4",
  "customerTrackingToken": "d7a8f9c1e2b345a678901234567890abcdef1234567890abcdef1234567890ab"
}
```
- **Responses**:
  - Success: `order:joined` with `{ room: "order:64f...", orderId: "64f..." }`
  - Error: `tracking_error` with `{ message: "..." }`

#### `admin:join`
- **Sender**: Staff/Admin client
- **Payload**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsIn..."
}
```
- **Responses**:
  - Success: `admin:joined` with `{ room: "admin:orders", user: { name: "...", role: "..." } }`
  - Error: `admin:error` with `{ message: "..." }`

---

### 3.2 Server -> Client Events

#### `order:created`
- **Recipient Room**: `admin:orders`
- **Trigger**: Customer successfully creates order via `POST /api/v1/orders`.
- **Payload**:
```json
{
  "order": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d4",
    "orderNumber": "CF-1042",
    "tableNumberSnapshot": "1",
    "orderStatus": "placed",
    "paymentStatus": "pending",
    "totalAmount": 9.00,
    "items": [...],
    "customerNotes": "...",
    "createdAt": "2026-10-27T15:00:00.000Z"
  }
}
```

#### `order:status_updated`
- **Recipient Rooms**: `order:{orderId}` and `admin:orders`
- **Trigger**: Staff advances order via `PATCH /api/v1/admin/orders/:id/status`.
- **Payload**:
```json
{
  "orderId": "64f1a2b3c4d5e6f7a8b9c0d4",
  "orderNumber": "CF-1042",
  "previousStatus": "placed",
  "orderStatus": "confirmed",
  "updatedAt": "2026-10-27T15:05:00.000Z",
  "note": "Optional staff note"
}
```

#### `order:ready`
- **Recipient Room**: `order:{orderId}`
- **Trigger**: Order transitions to `ready`. Triggers customer sound chime and pickup modal.
- **Payload**:
```json
{
  "orderId": "64f1a2b3c4d5e6f7a8b9c0d4",
  "orderNumber": "CF-1042",
  "message": "Your order CF-1042 is ready for pickup at the counter!",
  "tableNumber": "1",
  "paymentStatus": "pending",
  "readyAt": "2026-10-27T15:15:00.000Z"
}
```

#### `order:payment_updated`
- **Recipient Rooms**: `order:{orderId}` and `admin:orders`
- **Trigger**: Counter payment recorded via `PATCH /api/v1/admin/orders/:id/payment`.
- **Payload**:
```json
{
  "orderId": "64f1a2b3c4d5e6f7a8b9c0d4",
  "paymentStatus": "paid_counter",
  "updatedAt": "2026-10-27T15:16:00.000Z"
}
```

#### `menu:availability_changed`
- **Recipient**: Global broadcast (`io.emit`)
- **Trigger**: Staff toggles item stock via `PATCH /api/v1/admin/menu/:id/availability`.
- **Payload**:
```json
{
  "menuItemId": "64f1a2b3c4d5e6f7a8b9c0d2",
  "isAvailable": false
}
```
