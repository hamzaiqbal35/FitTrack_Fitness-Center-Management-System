const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { sendSubscriptionConfirmation } = require('../utils/emailService');

/**
 * @desc    Create Stripe subscription
 * @route   POST /api/subscriptions/create
 * @access  Private/Member
 */
const createSubscription = async (req, res) => {
    try {
        const { planId, paymentMethodId } = req.body;

        // Get plan details
        const plan = await Plan.findById(planId);
        if (!plan || !plan.isActive) {
            return res.status(404).json({ message: 'Plan not found or inactive' });
        }

        // Get or create Stripe customer
        let stripeCustomerId = req.user.stripeCustomerId;

        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: req.user.email,
                name: req.user.name,
                metadata: {
                    userId: req.user._id.toString(),
                },
            });
            stripeCustomerId = customer.id;

            // Update user with Stripe customer ID
            await User.findByIdAndUpdate(req.user._id, {
                stripeCustomerId,
            });
        }

        // Attach payment method to customer
        if (paymentMethodId) {
            await stripe.paymentMethods.attach(paymentMethodId, {
                customer: stripeCustomerId,
            });

            // Set as default payment method
            await stripe.customers.update(stripeCustomerId, {
                invoice_settings: {
                    default_payment_method: paymentMethodId,
                },
            });
        }

        // Create Stripe subscription
        const stripeSubscription = await stripe.subscriptions.create({
            customer: stripeCustomerId,
            items: [{ price: plan.stripePriceId }],
            payment_behavior: 'default_incomplete',
            payment_settings: { save_default_payment_method: 'on_subscription' },
            expand: ['latest_invoice.payment_intent'],
        });

        // Create subscription in database
        const subscription = await Subscription.create({
            userId: req.user._id,
            planId: plan._id,
            stripeCustomerId,
            stripeSubscriptionId: stripeSubscription.id,
            status: stripeSubscription.status,
            currentPeriodStart: new Date((stripeSubscription.current_period_start || stripeSubscription.start_date || Date.now() / 1000) * 1000),
            currentPeriodEnd: new Date((stripeSubscription.current_period_end || (Date.now() / 1000 + 30 * 24 * 60 * 60)) * 1000),
        });

        // Create notification
        await Notification.create({
            userId: req.user._id,
            type: 'subscription_created',
            title: 'Subscription Created',
            message: `Your subscription to ${plan.name} has been created. Please complete payment to activate.`,
        });

        res.status(201).json({
            subscription,
            clientSecret: stripeSubscription.latest_invoice.payment_intent.client_secret,
        });
    } catch (error) {
        console.error('Error creating subscription:', error);
        res.status(500).json({ message: 'Error creating subscription' });
    }
};

/**
 * @desc    Create Stripe Checkout Session
 * @route   POST /api/subscriptions/create-checkout-session
 * @access  Private/Member
 */
const createCheckoutSession = async (req, res) => {
    try {
        const { planId } = req.body;

        const plan = await Plan.findById(planId);
        if (!plan || !plan.isActive) {
            return res.status(404).json({ message: 'Plan not found or inactive' });
        }

        // Check if user already has an active subscription
        const existingSub = await Subscription.findOne({
            userId: req.user._id,
            status: { $in: ['active', 'trialing'] },
            currentPeriodEnd: { $gte: new Date() }
        });

        if (existingSub) {
            return res.status(400).json({ message: 'You already have an active subscription.' });
        }

        // Get or create Stripe customer
        let stripeCustomerId = req.user.stripeCustomerId;
        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: req.user.email,
                name: req.user.name,
                metadata: {
                    userId: req.user._id.toString(),
                },
            });
            stripeCustomerId = customer.id;
            await User.findByIdAndUpdate(req.user._id, { stripeCustomerId });
        }

        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            customer: stripeCustomerId,
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'pkr',
                        product_data: {
                            name: plan.name,
                            description: plan.description,
                        },
                        unit_amount: plan.price, // Amount in Paisa
                        recurring: {
                            interval: plan.interval,
                        },
                    },
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${clientUrl}/dashboard/subscription?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${clientUrl}/dashboard/subscription`,
            metadata: {
                userId: req.user._id.toString(),
                planId: plan._id.toString(),
            },
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({ message: 'Error creating checkout session' });
    }
};

/**
 * @desc    Sync subscription after success (for manual check/localhost)
 * @route   POST /api/subscriptions/sync
 * @access  Private/Member
 */
const syncSubscription = async (req, res) => {
    console.log('Syncing subscription for user:', req.user._id);
    try {
        const { sessionId } = req.body;
        console.log('Session ID:', sessionId);

        if (!sessionId) {
            return res.status(400).json({ message: 'Session ID is required' });
        }

        // Retrieve Checkout Session
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        console.log('Retrieved Session:', session ? session.id : 'null');

        if (!session || session.payment_status !== 'paid') {
            console.log('Payment not paid:', session ? session.payment_status : 'no session');
            return res.status(400).json({ message: 'Payment not completed or invalid session' });
        }

        const subscriptionId = session.subscription;
        console.log('Subscription ID from session:', subscriptionId);

        if (!subscriptionId) {
            return res.status(400).json({ message: 'No subscription found in session' });
        }

        // Retrieve Stripe Subscription
        const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
        console.log('Stripe Subscription Status:', stripeSubscription.status);

        // Check if we already have this subscription
        let subscription = await Subscription.findOne({ stripeSubscriptionId: subscriptionId });

        if (subscription) {
            // Check if status needs update
            // Check if status or dates need update
            if (subscription.status !== stripeSubscription.status ||
                subscription.currentPeriodEnd.getTime() !== stripeSubscription.current_period_end * 1000) {

                subscription.status = stripeSubscription.status;
                subscription.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
                subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
                await subscription.save();
            }
        } else {
            // If not found, create it (fallback for missing webhook)
            const planId = session.metadata.planId;
            console.log('Plan ID from metadata:', planId);

            const plan = await Plan.findById(planId);

            if (!plan) {
                console.error('Plan not found for ID:', planId);
                return res.status(404).json({ message: 'Plan not found' });
            }

            subscription = await Subscription.create({
                userId: req.user._id,
                planId: plan._id,
                stripeCustomerId: session.customer,
                stripeSubscriptionId: subscriptionId,
                status: stripeSubscription.status,
                currentPeriodStart: new Date((stripeSubscription.current_period_start || stripeSubscription.start_date || Date.now() / 1000) * 1000),
                currentPeriodEnd: new Date((stripeSubscription.current_period_end || (Date.now() / 1000 + 30 * 24 * 60 * 60)) * 1000),
            });
            console.log('Created new subscription:', subscription._id);
        }

        // Create Payment Record if it doesn't exist
        const paymentIntentId = session.payment_intent;
        if (paymentIntentId) {
            const existingPayment = await Payment.findOne({ stripePaymentIntentId: paymentIntentId });
            if (!existingPayment) {
                await Payment.create({
                    userId: req.user._id,
                    amount: session.amount_total,
                    stripePaymentIntentId: paymentIntentId,
                    status: 'paid', // session.payment_status is 'paid'
                    subscriptionId: subscription._id
                });
                console.log('Payment record created manually via sync');
            }
        } else if (session.mode === 'subscription' && session.invoice) {
            // If payment_intent is null (common in sub mode), use invoice ID to find/create
            // But usually latest_invoice has the payment_intent. 
            // For simplicity, we trust session.amount_total
            // We can check if we have a payment for this subscription recently?
            // Best effort:
            await Payment.create({
                userId: req.user._id,
                amount: session.amount_total,
                stripePaymentIntentId: typeof session.invoice === 'string' ? session.invoice : session.id, // Fallback
                status: 'paid',
                subscriptionId: subscription._id
            });
        }

        res.status(200).json({ message: 'Subscription synced', subscription });

    } catch (error) {
        console.error('Error syncing subscription:', error);
        res.status(500).json({ message: 'Error syncing subscription' });
    }
};

/**
 * @desc    Cancel subscription
 * @route   POST /api/subscriptions/cancel
 * @access  Private/Member
 */
const cancelSubscription = async (req, res) => {
    try {
        const { subscriptionId } = req.body;

        const subscription = await Subscription.findById(subscriptionId);

        if (!subscription) {
            return res.status(404).json({ message: 'Subscription not found' });
        }

        // Verify ownership
        if (subscription.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Cancel in Stripe
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
            cancel_at_period_end: true,
        });

        // Update subscription
        subscription.cancelAtPeriodEnd = true;
        await subscription.save();

        // Create notification
        await Notification.create({
            userId: req.user._id,
            type: 'subscription_cancelled',
            title: 'Subscription Cancelled',
            message: `Your subscription will be cancelled at the end of the current billing period.`,
        });

        res.json({ message: 'Subscription will be cancelled at period end', subscription });
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        res.status(500).json({ message: 'Error cancelling subscription' });
    }
};

/**
 * @desc    Get user's subscriptions
 * @route   GET /api/subscriptions/my-subscriptions
 * @access  Private/Member
 */
const getMySubscriptions = async (req, res) => {
    try {
        const subscriptions = await Subscription.find({ userId: req.user._id })
            .populate('planId')
            .sort({ createdAt: -1 });

        res.json(subscriptions);
    } catch (error) {
        console.error('Error fetching subscriptions:', error);
        res.status(500).json({ message: 'Error fetching subscriptions' });
    }
};

/**
 * @desc    Get subscription details
 * @route   GET /api/subscriptions/:id
 * @access  Private/Member/Admin
 */
const getSubscription = async (req, res) => {
    try {
        const subscription = await Subscription.findById(req.params.id).populate('planId');

        if (!subscription) {
            return res.status(404).json({ message: 'Subscription not found' });
        }

        // Verify ownership or admin
        if (
            subscription.userId.toString() !== req.user._id.toString() &&
            req.user.role !== 'admin'
        ) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        res.json(subscription);
    } catch (error) {
        console.error('Error fetching subscription:', error);
        res.status(500).json({ message: 'Error fetching subscription' });
    }
};

/**
 * @desc    Reactivate cancelled subscription
 * @route   PUT /api/subscriptions/:id/reactivate
 * @access  Private/Member
 */
const reactivateSubscription = async (req, res) => {
    try {
        const subscription = await Subscription.findById(req.params.id);

        if (!subscription) {
            return res.status(404).json({ message: 'Subscription not found' });
        }

        // Verify ownership
        if (subscription.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (!subscription.cancelAtPeriodEnd) {
            return res.status(400).json({ message: 'Subscription is not set to cancel' });
        }

        // Reactivate in Stripe
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
            cancel_at_period_end: false,
        });

        // Update subscription
        subscription.cancelAtPeriodEnd = false;
        await subscription.save();

        // Create notification
        await Notification.create({
            userId: req.user._id,
            type: 'subscription_reactivated',
            title: 'Subscription Reactivated',
            message: `Your subscription has been reactivated and will continue after the current period.`,
        });

        res.json({ message: 'Subscription reactivated successfully', subscription });
    } catch (error) {
        console.error('Error reactivating subscription:', error);
        res.status(500).json({ message: 'Error reactivating subscription' });
    }
};

module.exports = {
    createSubscription,
    createCheckoutSession,
    syncSubscription,
    cancelSubscription,
    getMySubscriptions,
    getSubscription,
    reactivateSubscription,
};
