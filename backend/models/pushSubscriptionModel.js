import mongoose from 'mongoose';

const pushSubscriptionSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    guestEmail: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    sessionId: {
      type: String,
      default: '',
      trim: true,
    },
    platform: {
      type: String,
      enum: ['web', 'ios', 'android'],
      default: 'web',
    },
    purpose: {
      type: String,
      enum: ['customer', 'admin-orders'],
      default: 'customer',
    },
    endpoint: {
      type: String,
      default: '',
      trim: true,
    },
    token: {
      type: String,
      default: '',
      trim: true,
    },
    keys: {
      p256dh: { type: String, default: '' },
      auth: { type: String, default: '' },
    },
    deviceId: {
      type: String,
      default: '',
      trim: true,
    },
    appVersion: {
      type: String,
      default: '',
      trim: true,
    },
    deviceLabel: {
      type: String,
      default: '',
      trim: true,
      maxlength: 120,
    },
    userAgent: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    preferences: {
      orderUpdates: { type: Boolean, default: true },
      promotions: { type: Boolean, default: false },
      support: { type: Boolean, default: true },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

pushSubscriptionSchema.index({ user: 1, endpoint: 1 });
pushSubscriptionSchema.index({ user: 1, token: 1 });
pushSubscriptionSchema.index({ guestEmail: 1, sessionId: 1 });
pushSubscriptionSchema.index({ user: 1, purpose: 1, isActive: 1, updatedAt: -1 });
pushSubscriptionSchema.index(
  { endpoint: 1, purpose: 1 },
  { unique: true, partialFilterExpression: { purpose: 'admin-orders' } }
);

const PushSubscription = mongoose.model('PushSubscription', pushSubscriptionSchema);

export default PushSubscription;
