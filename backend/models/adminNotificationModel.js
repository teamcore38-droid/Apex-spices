import mongoose from 'mongoose';

const adminNotificationSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    orderNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    adminUrl: {
      type: String,
      required: true,
      trim: true,
      match: /^\/admin\/orders\/[a-f\d]{24}$/i,
    },
    sourceEventKey: {
      type: String,
      default: '',
      trim: true,
      maxlength: 180,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

adminNotificationSchema.index({ user: 1, createdAt: -1, _id: -1 });
adminNotificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
adminNotificationSchema.index(
  { user: 1, sourceEventKey: 1 },
  {
    unique: true,
    partialFilterExpression: { sourceEventKey: { $type: 'string', $gt: '' } },
  }
);

const AdminNotification = mongoose.model('AdminNotification', adminNotificationSchema);

export default AdminNotification;
