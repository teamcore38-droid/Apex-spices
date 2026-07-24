import mongoose from 'mongoose';

const storeSettingsSchema = mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'default',
    },
    checkoutMode: {
      type: String,
      enum: ['whatsapp', 'online'],
      default: 'whatsapp',
    },
    whatsappNumber: {
      type: String,
      default: '94765669961',
      trim: true,
    },
  },
  { timestamps: true }
);

const StoreSettings = mongoose.model('StoreSettings', storeSettingsSchema);

export default StoreSettings;
