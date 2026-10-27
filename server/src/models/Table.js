const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema(
  {
    tableNumber: {
      type: String,
      required: [true, 'Table number is required'],
      unique: true,
      trim: true
    },
    qrCodeToken: {
      type: String,
      required: [true, 'QR code token is required'],
      unique: true,
      index: true
    },
    capacity: {
      type: Number,
      default: 2,
      min: 1
    },
    status: {
      type: String,
      enum: ['available', 'occupied', 'reserved', 'inactive'],
      default: 'available'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Table', tableSchema);
