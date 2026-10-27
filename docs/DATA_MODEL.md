# CafeFlow - Data Models & Schema Specifications

> **Status:** Verified & Working. Synchronized with MongoDB and Mongoose implementation in `/server/src/models`.

---

## 1. Core Invariants & State Engines

1. **Server Calculation of Totals**: Unit prices and subtotal calculations are fetched from the database, preventing client-side price modification.
2. **Snapshot Immutability**: Every order subdocument (`Order.items`) stores a frozen snapshot of the item's name and unit price at creation time.
3. **Availability Validation**: Items marked `isAvailable: false` cannot be ordered.
4. **Decoupled Statuses**: `orderStatus` and `paymentStatus` are distinct fields with separate transition rules.
5. **Customer Privacy Token**: `customerTrackingToken` (32 bytes hex) is generated for every order to ensure customers can only track their own orders.

---

## 2. Order Status Enums & State Machine

### Permitted Values (`orderStatus`)
- `placed`: Customer submitted order.
- `confirmed`: Staff verified order.
- `preparing`: Kitchen is preparing items.
- `ready`: Items prepared; customer alerted to collect.
- `completed`: Customer collected order (Terminal state).
- `cancelled`: Staff cancelled order (Terminal state).

### Transition Matrix
| Current Status | Permitted Next Statuses | Actor | Notes |
|---|---|---|---|
| `placed` | `confirmed`, `cancelled` | Admin / Staff | Customers cannot self-transition |
| `confirmed` | `preparing`, `cancelled` | Admin / Staff | Kitchen starts prep |
| `preparing` | `ready`, `cancelled` | Admin / Staff | Kitchen finishes; triggers customer pickup alert |
| `ready` | `completed`, `cancelled` | Admin / Staff | Order collected |
| `completed` | *None* | None | Terminal state |
| `cancelled` | *None* | None | Terminal state |

*Any unauthorized transition (e.g. `placed` -> `completed` or `completed` -> anything) is rejected with HTTP `400 Bad Request` (`INVALID_STATUS_TRANSITION`).*

---

## 3. Payment Status Enums & Lifecycle

Payment is completed at the cafe counter upon pickup.

### Permitted Values (`paymentStatus`)
- `pending`: Default on order placement.
- `paid_counter`: Staff verified payment collection at counter.
- `refunded`: Staff issued refund.

### Payment Transition Matrix
| Current Status | Permitted Next Statuses | Actor |
|---|---|---|
| `pending` | `paid_counter`, `refunded` | Admin / Staff |
| `paid_counter` | `refunded` | Admin / Staff |
| `refunded` | *None* | Terminal state |

---

## 4. Mongoose Schemas (Actual Server Implementation)

### 4.1 User Schema (`server/src/models/User.js`)
```javascript
{
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'staff'], default: 'staff' },
  isActive: { type: Boolean, default: true },
  timestamps: true
}
```

### 4.2 Table Schema (`server/src/models/Table.js`)
```javascript
{
  tableNumber: { type: String, required: true, unique: true, trim: true },
  qrCodeToken: { type: String, required: true, unique: true, index: true },
  capacity: { type: Number, default: 2, min: 1 },
  status: { type: String, enum: ['available', 'occupied', 'reserved', 'inactive'], default: 'available' },
  isActive: { type: Boolean, default: true },
  timestamps: true
}
```

### 4.3 Category Schema (`server/src/models/Category.js`)
```javascript
{
  name: { type: String, required: true, unique: true, trim: true, maxlength: 60 },
  description: { type: String, trim: true, maxlength: 300, default: '' },
  displayOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  timestamps: true
}
```

### 4.4 MenuItem Schema (`server/src/models/MenuItem.js`)
```javascript
{
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 500, default: '' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  price: { type: Number, required: true, min: 0 },
  imageUrl: { type: String, default: '' },
  isAvailable: { type: Boolean, default: true, index: true },
  dietaryFlags: {
    type: [String],
    enum: ['vegetarian', 'vegan', 'gluten-free', 'contains-nuts', 'dairy-free'],
    default: []
  },
  displayOrder: { type: Number, default: 0 },
  timestamps: true
}
```

### 4.5 Order Schema (`server/src/models/Order.js`)
```javascript
// Snapshot Subdocument
const orderItemSnapshotSchema = {
  menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  name: { type: String, required: true },
  unitPrice: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1 },
  subtotal: { type: Number, required: true, min: 0 },
  specialInstructions: { type: String, trim: true, maxlength: 200, default: '' }
};

// Root Order Schema
{
  orderNumber: { type: String, required: true, unique: true, index: true },
  table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true, index: true },
  tableNumberSnapshot: { type: String, required: true },
  items: [orderItemSnapshotSchema],
  subtotal: { type: Number, required: true, min: 0 },
  tax: { type: Number, default: 0, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  orderStatus: { type: String, enum: ORDER_STATUS_LIST, default: 'placed', index: true },
  paymentStatus: { type: String, enum: PAYMENT_STATUS_LIST, default: 'pending', index: true },
  customerTrackingToken: { type: String, required: true, unique: true, index: true },
  customerNotes: { type: String, trim: true, maxlength: 300, default: '' },
  statusHistory: [
    {
      status: { type: String, required: true },
      changedAt: { type: Date, default: Date.now },
      changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      note: { type: String }
    }
  ],
  timestamps: true
}
```
