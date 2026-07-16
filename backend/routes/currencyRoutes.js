import express from 'express';
import { getCurrencyQuoteForCountry } from '../controllers/currencyController.js';

const router = express.Router();

router.route('/quote').get(getCurrencyQuoteForCountry);

export default router;
