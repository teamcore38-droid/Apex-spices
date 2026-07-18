import dotenv from 'dotenv';
import Product from '../models/productModel.js';
import Review from '../models/reviewModel.js';
import connectDB from '../config/db.js';

dotenv.config();

await connectDB({ strict: true });

const dropLegacyReviewIndex = async () => {
  try {
    await Review.collection.dropIndex('product_1_user_1');
    console.log('Dropped legacy review index product_1_user_1');
  } catch (error) {
    if (error.codeName === 'IndexNotFound' || error.code === 27) {
      console.log('Legacy review index product_1_user_1 was not present');
      return;
    }

    throw error;
  }
};

const syncProductRatings = async () => {
  const stats = await Review.aggregate([
    {
      $match: {
        status: 'Approved',
        verifiedPurchase: true,
      },
    },
    {
      $group: {
        _id: '$product',
        rating: { $avg: '$rating' },
        numReviews: { $sum: 1 },
      },
    },
  ]);

  await Product.updateMany({}, { $set: { rating: 0, numReviews: 0 } });

  await Promise.all(
    stats.map((productStats) =>
      Product.updateOne(
        { _id: productStats._id },
        {
          $set: {
            rating: Number(Number(productStats.rating || 0).toFixed(1)),
            numReviews: Number(productStats.numReviews || 0),
          },
        }
      )
    )
  );

  console.log(`Synchronized review stats for ${stats.length} products`);
};

try {
  await dropLegacyReviewIndex();
  await Review.syncIndexes();
  await syncProductRatings();
  console.log('Review integrity sync complete');
  process.exit(0);
} catch (error) {
  console.error(`Review integrity sync failed: ${error.message}`);
  process.exit(1);
}
