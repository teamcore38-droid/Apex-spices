import mongoose from 'mongoose';

const deviceDeliverySchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PushSubscription',
      required: true,
    },
    endpointHash: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'sending', 'sent', 'failed', 'expired', 'unknown'],
      default: 'pending',
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    statusCode: {
      type: Number,
      default: null,
    },
    error: {
      type: String,
      default: '',
      maxlength: 500,
    },
    attemptedAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const notificationOutboxSchema = mongoose.Schema(
  {
    eventKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 180,
    },
    eventType: {
      type: String,
      required: true,
      enum: ['order.created', 'order.paid'],
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    workerUrl: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'publishing', 'published', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    failureStage: {
      type: String,
      enum: ['', 'publish', 'process'],
      default: '',
    },
    publishAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    processAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    qstashMessageIds: {
      type: [String],
      default: [],
    },
    deviceDeliveries: {
      type: [deviceDeliverySchema],
      default: [],
    },
    notificationCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastError: {
      type: String,
      default: '',
      maxlength: 1000,
    },
    nextAttemptAt: {
      type: Date,
      default: Date.now,
    },
    publishLockedUntil: {
      type: Date,
      default: null,
    },
    processingLockedUntil: {
      type: Date,
      default: null,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

notificationOutboxSchema.index({ status: 1, nextAttemptAt: 1, createdAt: 1 });
notificationOutboxSchema.index({ order: 1, eventType: 1 });
notificationOutboxSchema.index({ status: 1, processingLockedUntil: 1 });
notificationOutboxSchema.index({ status: 1, publishLockedUntil: 1 });
notificationOutboxSchema.index({ status: 1, publishedAt: 1 });

const NotificationOutbox = mongoose.model('NotificationOutbox', notificationOutboxSchema);

export default NotificationOutbox;
