# CafeFlow - Frontend Integration Guide

> **Status:** Verified & Working. Synchronized with the live backend endpoints and Socket.IO events.

---

## 1. Network Configuration & Ports

During local development:
- **Backend API Base**: `http://localhost:5001/api/v1`
- **Socket.IO Host**: `http://localhost:5001`
- **Frontend Dev Server**: `http://localhost:5173`

Frontend `.env` template:
```env
VITE_API_URL=http://localhost:5001/api/v1
VITE_SOCKET_URL=http://localhost:5001
```

---

## 2. API Communication Service Patterns

The frontend should create a centralized API service (`src/services/api.js`) utilizing `axios` or standard `fetch`.

### 2.1 Customer Endpoints
1. **Validate QR**: `GET /api/v1/tables/validate-qr/:qrCodeToken`
   - Call on route load `/table/:qrCodeToken`.
   - Store table ID and table number in state/sessionStorage upon success.
2. **Fetch Active Menu**: `GET /api/v1/menu`
   - Returns `{ menuItems: [...] }`. Items with `isAvailable: false` are excluded by default.
3. **Fetch Categories**: `GET /api/v1/categories`
   - Returns category pills for horizontal scrolling/filtering.
4. **Submit Order**: `POST /api/v1/orders`
   - Payload: `{ qrCodeToken, items: [{ menuItemId, quantity, specialInstructions }], customerNotes }`
   - Response: Returns `order` object and `customerTrackingToken`.
   - Action: Store `customerTrackingToken` in `localStorage` keyed by `orderId`.
   - Redirect: Navigate to `/order/:orderId/track`.
5. **Track Order**: `GET /api/v1/orders/:orderId/track?token=<customerTrackingToken>`
   - Alternatively pass header `X-Customer-Token: <token>`.

### 2.2 Admin / Staff Endpoints
1. **Login**: `POST /api/v1/auth/login`
   - Payload: `{ email, password }`
   - Response: `{ token, user }`. Store token in `localStorage` or secure memory.
2. **Current Profile**: `GET /api/v1/auth/me` (Header: `Authorization: Bearer <token>`).
3. **Live Orders Stream**: `GET /api/v1/admin/orders` (Header: `Authorization: Bearer <token>`).
   - Query filters: `?status=placed`, `?status=preparing`, `?paymentStatus=pending`.
4. **Advance Order Status**: `PATCH /api/v1/admin/orders/:id/status`
   - Payload: `{ orderStatus: 'preparing' | 'ready' | 'completed' | 'cancelled', note: '...' }`
5. **Counter Payment**: `PATCH /api/v1/admin/orders/:id/payment`
   - Payload: `{ paymentStatus: 'paid_counter', note: 'Paid cash at counter' }`
6. **Stock Availability 86 Toggle**: `PATCH /api/v1/admin/menu/:id/availability`
   - Payload: `{ isAvailable: false }`

---

## 3. Real-Time Socket.IO Integration Hooks

### 3.1 Customer Tracking Hook Pattern
```javascript
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export const useCustomerOrderTracking = (orderId, customerTrackingToken) => {
  const [order, setOrder] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!orderId || !customerTrackingToken) return;

    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001');

    // Authenticate and join specific order room
    socket.emit('order:join_tracking', { orderId, customerTrackingToken });

    socket.on('order:status_updated', (data) => {
      setOrder(prev => prev ? { ...prev, orderStatus: data.orderStatus } : null);
    });

    socket.on('order:ready', (data) => {
      setIsReady(true);
      // Play audio chime or display banner
    });

    socket.on('order:payment_updated', (data) => {
      setOrder(prev => prev ? { ...prev, paymentStatus: data.paymentStatus } : null);
    });

    return () => socket.disconnect();
  }, [orderId, customerTrackingToken]);

  return { order, setOrder, isReady };
};
```

### 3.2 Staff Admin Orders Stream Hook Pattern
```javascript
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export const useAdminLiveStream = (authToken) => {
  const [incomingOrders, setIncomingOrders] = useState([]);

  useEffect(() => {
    if (!authToken) return;

    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001');

    socket.emit('admin:join', { token: authToken });

    socket.on('order:created', (data) => {
      setIncomingOrders(prev => [data.order, ...prev]);
      // Play alert chime in kitchen
    });

    socket.on('order:status_updated', (data) => {
      // Update local state column/card
    });

    return () => socket.disconnect();
  }, [authToken]);

  return { incomingOrders };
};
```

---

## 4. UI Error Handling & Envelope Parsing

Every API response follows:
- Success: `response.data.success === true` -> access data via `response.data.data`.
- Error: `response.data.success === false` -> access machine error code via `response.data.error.code` and message via `response.data.error.message`.
- Common codes:
  - `ITEM_UNAVAILABLE`: Item went out of stock during checkout. Display warning and prompt user to remove it.
  - `TABLE_NOT_FOUND`: Invalid table QR code. Direct user to rescan table sticker.
  - `INVALID_STATUS_TRANSITION`: Attempted illegal status jump.
  - `FORBIDDEN`: Invalid tracking token.
