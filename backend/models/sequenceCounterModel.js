import mongoose from 'mongoose';

const sequenceCounterSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    value: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

const SequenceCounter = mongoose.model('SequenceCounter', sequenceCounterSchema);

export default SequenceCounter;
