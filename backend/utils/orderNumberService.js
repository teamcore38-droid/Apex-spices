import SequenceCounter from '../models/sequenceCounterModel.js';

const ORDER_NUMBER_COUNTER_NAME = 'orderNumber';
const ORDER_NUMBER_PREFIX = 'AXS';
const ORDER_NUMBER_INITIAL_VALUE = 99;
const ORDER_NUMBER_PAD_LENGTH = 6;

const formatOrderNumber = (value) =>
  `${ORDER_NUMBER_PREFIX}-${String(Number(value || 0)).padStart(ORDER_NUMBER_PAD_LENGTH, '0')}`;

const getNextOrderNumber = async () => {
  try {
    await SequenceCounter.create({
      name: ORDER_NUMBER_COUNTER_NAME,
      value: ORDER_NUMBER_INITIAL_VALUE,
    });
  } catch (error) {
    if (error?.code !== 11000) {
      throw error;
    }
  }

  const counter = await SequenceCounter.findOneAndUpdate(
    { name: ORDER_NUMBER_COUNTER_NAME },
    { $inc: { value: 1 } },
    {
      new: true,
    }
  );

  return formatOrderNumber(counter.value);
};

export {
  ORDER_NUMBER_COUNTER_NAME,
  ORDER_NUMBER_INITIAL_VALUE,
  ORDER_NUMBER_PAD_LENGTH,
  ORDER_NUMBER_PREFIX,
  formatOrderNumber,
  getNextOrderNumber,
};
