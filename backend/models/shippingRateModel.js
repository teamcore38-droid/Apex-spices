import mongoose from 'mongoose';

const shippingRateSchema = mongoose.Schema(
  {
    locationType: {
      type: String,
      enum: ['domestic', 'international'],
      default: 'international',
      trim: true,
    },
    carrier: {
      type: String,
      required: true,
      trim: true,
    },
    service: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      default: '',
      uppercase: true,
      trim: true,
    },
    countryCode: {
      type: String,
      default: '',
      uppercase: true,
      trim: true,
    },
    countryName: {
      type: String,
      default: '',
      trim: true,
    },
    state: {
      type: String,
      default: '',
      uppercase: true,
      trim: true,
    },
    district: {
      type: String,
      default: '',
      uppercase: true,
      trim: true,
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    freeShippingThreshold: {
      type: Number,
      default: 0,
      min: 0,
    },
    estimatedDaysMin: {
      type: Number,
      default: 3,
      min: 0,
    },
    estimatedDaysMax: {
      type: Number,
      default: 5,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

shippingRateSchema.index({ country: 1, state: 1, isActive: 1 });
shippingRateSchema.index({ locationType: 1, countryCode: 1, district: 1, isActive: 1 });

const ShippingRate = mongoose.model('ShippingRate', shippingRateSchema);

export default ShippingRate;
