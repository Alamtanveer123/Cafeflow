# CafeFlow - REST API Contract

> **Status:** Verified & Working. Fully aligned with the `/server` implementation.

---

## 1. Global API Standards

- **Base URL Prefix**: `/api/v1`
- **Default Content-Type**: `application/json`
- **Authentication**: Bearer token via `Authorization: Bearer <jwt_token>` (for Admin/Staff endpoints).
- **Customer Tracking Authorization**: Protected via `customerTrackingToken` passed as query param (`?token=<token>`) or header (`X-Customer-Token`), preventing order ID enumeration.

---

## 2. Standard Response Envelopes

### 2.1 Success Response Envelope
All successful requests return HTTP status codes `200 OK` or `201 Created`:
```json
{
  "success": true,
  "data": { ... },
  "message": "Human-readable confirmation (optional)"
}
```

### 2.2 Error Response Envelope
All error responses adhere strictly to this envelope:
```json
{
  "success": false,
  "error": {
    "code": "SPECIFIC_ERROR_CODE",
    "message": "Descriptive, human-readable error message",
    "details": [
      {
        "field": "items[0].quantity",
        "issue": "Quantity must be greater than or equal to 1"
      }
    ]
  }
}
```

### 2.3 Standard HTTP Status Codes
| Code | Meaning | Common Usage |
|---|---|---|
| `200 OK` | Success | Successful GET, PATCH, PUT |
| `201 Created` | Created | Resource successfully created (e.g. Order, Menu item) |
| `400 Bad Request` | Client Error | Validation failure, illegal status transition, item unavailable |
| `401 Unauthorized` | Auth Required | Missing or invalid JWT token |
| `403 Forbidden` | Access Denied | Insufficient permissions for role or invalid tracking token |
| `404 Not Found` | Not Found | Resource (table, order, item) not found |
| `409 Conflict` | Conflict | Duplicate table number, duplicate category name |
| `500 Server Error` | Internal Error | Unhandled server exception |

---

## 3. Registered & Verified Endpoints

### 3.1 Public Menu & Categories

#### `GET /api/v1/categories`
- **Auth**: None (Public)
- **Description**: Fetch all active menu categories.
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
        "name": "Artisan Coffee",
        "description": "Freshly roasted speciality beans",
        "displayOrder": 1
      }
    ]
  }
}
```

#### `GET /api/v1/menu`
- **Auth**: None (Public)
- **Query Parameters**:
  - `category` (optional, ObjectId): Filter by category ID.
  - `availableOnly` (optional, boolean, default: `true`).
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "menuItems": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d2",
        "name": "Oat Milk Cappuccino",
        "description": "Double espresso with silky steamed oat milk and cocoa dusting",
        "category": {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
          "name": "Artisan Coffee"
        },
        "price": 4.50,
        "imageUrl": "",
        "isAvailable": true,
        "dietaryFlags": ["vegan", "dairy-free"],
        "displayOrder": 1
      }
    ]
  }
}
```

---

### 3.2 Table & QR Validation

#### `GET /api/v1/tables/validate-qr/:qrCodeToken`
- **Auth**: None (Public)
- **Description**: Verifies a table's QR token when scanned by a customer.
- **Success Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "table": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d3",
      "tableNumber": "1",
      "status": "available",
      "isActive": true
    }
  }
}
```
- **Error Response**: `404 Not Found` (`TABLE_NOT_FOUND`)

---

### 3.3 Customer Order Placement & Tracking

#### `POST /api/v1/orders`
- **Auth**: None (Public customer checkout)
- **Business Logic Enforced by Server**:
  1. Validates `qrCodeToken` belongs to an active table.
  2. Queries current `MenuItem` models for each requested item ID.
  3. Rejects if any item has `isAvailable: false` (`400 ITEM_UNAVAILABLE`).
  4. Computes item subtotals from database `price` (ignores any client-passed price).
  5. Computes order subtotal, calculates tax (if applicable), and sets `totalAmount`.
  6. Creates immutable snapshot of item names and unit prices.
  7. Generates a unique, secure `customerTrackingToken` (32-byte hex string) and `orderNumber` (`CF-xxxx`).
  8. Emits `order:created` via Socket.IO to `admin:orders` room.
- **Request Body**:
```json
{
  "qrCodeToken": "qr_table_1_cafeflow",
  "items": [
    {
      "menuItemId": "64f1a2b3c4d5e6f7a8b9c0d2",
      "quantity": 2,
      "specialInstructions": "Extra hot"
    }
  ],
  "customerNotes": "Please bring extra napkins"
}
```
- **Success Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "order": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d4",
      "orderNumber": "CF-1042",
      "tableNumber": "1",
      "orderStatus": "placed",
      "paymentStatus": "pending",
      "items": [
        {
          "menuItem": "64f1a2b3c4d5e6f7a8b9c0d2",
          "name": "Oat Milk Cappuccino",
          "unitPrice": 4.50,
          "quantity": 2,
          "subtotal": 9.00,
          "specialInstructions": "Extra hot"
        }
      ],
      "subtotal": 9.00,
      "tax": 0.00,
      "totalAmount": 9.00,
      "customerNotes": "Please bring extra napkins",
      "createdAt": "2026-10-27T15:00:00.000Z"
    },
    "customerTrackingToken": "d7a8f9c1e2b345a678901234567890abcdef1234567890abcdef1234567890ab"
  },
  "message": "Order placed successfully"
}
```

#### `GET /api/v1/orders/:orderId/track`
- **Auth**: Requires valid `customerTrackingToken` via query parameter `?token=<token>` or header `X-Customer-Token`.
- **Security Rule**: Returns `403 Forbidden` (`FORBIDDEN`) if token is forged or does not match the order.
- **Success Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "order": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d4",
      "orderNumber": "CF-1042",
      "tableNumber": "1",
      "orderStatus": "preparing",
      "paymentStatus": "pending",
      "items": [...],
      "totalAmount": 9.00,
      "createdAt": "2026-10-27T15:00:00.000Z",
      "updatedAt": "2026-10-27T15:05:00.000Z"
    }
  }
}
```

---

### 3.4 Admin Authentication

#### `POST /api/v1/auth/login`
- **Auth**: None (Credentials)
- **Request Body**:
```json
{
  "email": "admin@cafeflow.com",
  "password": "Admin@123456"
}
```
- **Success Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d0",
      "name": "Cafe Manager",
      "email": "admin@cafeflow.com",
      "role": "admin"
    }
  },
  "message": "Login successful"
}
```

#### `GET /api/v1/auth/me`
- **Auth**: Admin / Staff (`Authorization: Bearer <jwt>`)
- **Success Response**: `200 OK`

---

### 3.5 Admin Order & Resource Management (`/api/v1/admin/*`)

#### `GET /api/v1/admin/orders`
- **Auth**: Admin / Staff (`Authorization: Bearer <jwt>`)
- **Query Parameters**: `status`, `paymentStatus`, `limit` (default: 50), `page` (default: 1)
- **Success Response**: `200 OK`

#### `PATCH /api/v1/admin/orders/:id/status`
- **Auth**: Admin / Staff (`Authorization: Bearer <jwt>`)
- **Enforces**: Transition matrix (`placed` -> `confirmed` -> `preparing` -> `ready` -> `completed` / `cancelled`).
- **Request Body**:
```json
{
  "orderStatus": "preparing",
  "note": "Optional staff note"
}
```
- **Success Response**: `200 OK`
- **Error Response**: `400 Bad Request` (`INVALID_STATUS_TRANSITION`)

#### `PATCH /api/v1/admin/orders/:id/payment`
- **Auth**: Admin / Staff (`Authorization: Bearer <jwt>`)
- **Request Body**:
```json
{
  "paymentStatus": "paid_counter",
  "note": "Paid cash at counter"
}
```
- **Success Response**: `200 OK`

#### `GET /api/v1/admin/tables`
- **Auth**: Admin / Staff (`Authorization: Bearer <jwt>`)
- **Success Response**: `200 OK`

#### `POST /api/v1/admin/tables`
- **Auth**: Admin (`Authorization: Bearer <jwt>`)
- **Request Body**:
```json
{
  "tableNumber": "5",
  "capacity": 4
}
```
- **Success Response**: `201 Created` (Server generates `qrCodeToken`)

#### `POST /api/v1/admin/menu`
- **Auth**: Admin (`Authorization: Bearer <jwt>`)
- **Request Body**:
```json
{
  "name": "Matcha Latte",
  "category": "64f1a2b3c4d5e6f7a8b9c0d1",
  "price": 5.25,
  "dietaryFlags": ["vegan"]
}
```
- **Success Response**: `201 Created`

#### `PATCH /api/v1/admin/menu/:id/availability`
- **Auth**: Admin / Staff (`Authorization: Bearer <jwt>`)
- **Request Body**:
```json
{
  "isAvailable": false
}
```
- **Success Response**: `200 OK` (Broadcasts `menu:availability_changed` to all clients)

#### `POST /api/v1/admin/categories`
- **Auth**: Admin (`Authorization: Bearer <jwt>`)
- **Request Body**: `{ "name": "Cold Drinks", "description": "Iced beverages", "displayOrder": 3 }`
- **Success Response**: `201 Created`

---

### 3.6 Health Check

#### `GET /api/v1/health`
- **Auth**: None (Public)
- **Response**: `200 OK` `{ "success": true, "data": { "status": "UP", "timestamp": "..." } }`
