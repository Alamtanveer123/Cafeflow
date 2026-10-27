const mongoose = require('mongoose');
const { ORDER_STATUS_LIST, ORDER_STATUSES } = require('../constants/orderStatus');
const { PAYMENT_STATUS_LIST, PAYMENT_STATUSES } = require('../constants/paymentStatus');

const orderItemSnapshotSchema = new mongoose.Schema(
  {
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    specialInstructions: {
      type: String,
      trim: true,
      maxlength: 200,
      default: ''
    }
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Table',
      required: true,
      index: true
    },
    tableNumberSnapshot: {
      type: String,
      required: true
    },
    items: {
      type: [orderItemSnapshotSchema],
      required: true,
      validate: [val => val.length > 0, 'Order must contain at least one item']
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    tax: {
      type: Number,
      default: 0,
      min: 0
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    orderStatus: {
      type: String,
      enum: ORDER_STATUS_LIST,
      default: ORDER_STATUSES.PLACED,
      index: true
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUS_LIST,
      default: PAYMENT_STATUSES.PENDING,
      index: true
    },
    customerTrackingToken: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    customerNotes: {
      type: String,
      trim: true,
      maxlength: 300,
      default: ''
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        note: { type: String }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
