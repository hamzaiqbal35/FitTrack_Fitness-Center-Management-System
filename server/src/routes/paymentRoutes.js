const express = require('express');
const router = express.Router();
const { createPaymentIntent, recordPayment, getMyPayments, getAllPayments } = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/create-intent', protect, createPaymentIntent);
router.post('/record', protect, recordPayment);
router.get('/my-payments', protect, getMyPayments);
router.get('/', protect, authorize('admin'), getAllPayments);

module.exports = router;
