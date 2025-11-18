const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const axios = require('axios');

const YOCO_API_URL = 'https://payments.yoco.com/api';
const YOCO_SECRET_KEY = process.env.YOCO_SECRET_KEY || 'sk_test_bcb857ceoL5PPWx98584973a0931';

// Initialize payment
router.post('/initialize', auth, async (req, res) => {
    try {
        const { amount, items, description } = req.body;

        // Create transaction record
        const transaction = new Transaction({
            userId: req.user.id,
            amount,
            description,
            items,
            paymentMethod: 'yoco',
            status: 'pending'
        });
        await transaction.save();

        // Create Yoco checkout
        const response = await axios.post(
            `${YOCO_API_URL}/checkouts`,
            {
                amount: Math.round(amount * 100), // Convert to cents
                currency: 'ZAR',
                metadata: {
                    transactionId: transaction._id.toString()
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${YOCO_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Update transaction with checkout URL
        transaction.checkoutUrl = response.data.redirectUrl;
        await transaction.save();

        res.json({
            checkoutUrl: response.data.redirectUrl,
            transactionId: transaction._id
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Webhook handler for Yoco events
router.post('/webhook', async (req, res) => {
    try {
        const event = req.body;
        const transaction = await Transaction.findOne({
            'metadata.transactionId': event.metadata.transactionId
        });

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        // Record webhook event
        transaction.webhookEvents.push({
            eventType: event.type,
            timestamp: new Date(),
            data: event
        });

        // Update transaction status based on event type
        switch (event.type) {
            case 'payment.succeeded':
                transaction.status = 'completed';
                transaction.yocoPaymentId = event.id;
                break;
            case 'payment.failed':
                transaction.status = 'failed';
                break;
            case 'payment.refunded':
                transaction.status = 'refunded';
                break;
        }

        await transaction.save();
        res.json({ received: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get transaction status
router.get('/status/:transactionId', auth, async (req, res) => {
    try {
        const transaction = await Transaction.findOne({
            _id: req.params.transactionId,
            userId: req.user.id
        });

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        res.json({
            status: transaction.status,
            amount: transaction.amount,
            items: transaction.items,
            createdAt: transaction.createdAt,
            updatedAt: transaction.updatedAt
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;