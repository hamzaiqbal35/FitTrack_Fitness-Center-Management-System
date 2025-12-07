const WorkoutPlan = require('../models/WorkoutPlan');
const upload = require('../middleware/uploadMiddleware');
const { uploadFile, deleteFile, extractPublicId } = require('../utils/cloudinaryService');
const AuditLog = require('../models/AuditLog');

/**
 * @desc    Get all workout plans (with visibility filtering)
 * @route   GET /api/workout-plans
 * @access  Private
 */
const getWorkoutPlans = async (req, res) => {
    try {
        const { trainerId, tags } = req.query;

        let query = {};

        // Filter by visibility
        if (req.user.role === 'member') {
            const Subscription = require('../models/Subscription');

            // Check for ANY active subscription (Gym Membership)
            const activeSubscription = await Subscription.findOne({
                userId: req.user._id,
                status: { $in: ['active', 'trialing'] }
            });

            const allowedVisibilities = ['public'];
            if (activeSubscription) {
                allowedVisibilities.push('members_only');
            }

            query.visibility = { $in: allowedVisibilities };
        } else if (req.user.role === 'trainer') {
            // Trainers can see all plans or filter by their own
            if (trainerId) {
                query.trainerId = trainerId;
            }
        }
        // Admins can see all plans

        if (tags) {
            query.tags = { $in: tags.split(',') };
        }

        const plans = await WorkoutPlan.find(query)
            .populate('trainerId', 'name specialization')
            .sort({ uploadedAt: -1 });

        res.json(plans);
    } catch (error) {
        console.error('Error fetching workout plans:', error);
        res.status(500).json({ message: 'Error fetching workout plans' });
    }
};

/**
 * @desc    Get workout plan by ID
 * @route   GET /api/workout-plans/:id
 * @access  Private
 */
const getWorkoutPlan = async (req, res) => {
    try {
        const plan = await WorkoutPlan.findById(req.params.id).populate(
            'trainerId',
            'name specialization'
        );

        if (!plan) {
            return res.status(404).json({ message: 'Workout plan not found' });
        }

        // Check visibility permissions
        if (plan.visibility === 'public' || req.user.role === 'admin' || (req.user.role === 'trainer' && plan.trainerId._id.toString() === req.user._id.toString())) {
            // Allow access
        } else {
            // It's members_only
            const Subscription = require('../models/Subscription');
            const activeSubscription = await Subscription.findOne({
                userId: req.user._id,
                status: { $in: ['active', 'trialing'] }
            });

            if (!activeSubscription) {
                return res.status(403).json({ message: 'This plan is exclusive to Gym Members. Please subscribe to a membership to access.' });
            }
        }

        res.json(plan);
    } catch (error) {
        console.error('Error fetching workout plan:', error);
        res.status(500).json({ message: 'Error fetching workout plan' });
    }
};

/**
 * @desc    Upload workout plan
 * @route   POST /api/workout-plans
 * @access  Private/Trainer/Admin
 */
const uploadWorkoutPlan = async (req, res) => {
    try {
        const { title, description, visibility, tags, price } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a file' });
        }

        // Upload to Cloudinary
        const fileUrl = await uploadFile(req.file.buffer, 'fittrack/workout-plans');

        // Create workout plan
        const plan = await WorkoutPlan.create({
            trainerId: req.user._id,
            title,
            description,
            fileUrl,
            fileType: req.file.mimetype,
            visibility: visibility || 'members_only',
            price: price || 0,
            tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        });

        // Create audit log
        await AuditLog.create({
            userId: req.user._id,
            action: 'upload_workout_plan',
            resource: 'WorkoutPlan',
            resourceId: plan._id,
            details: { title, visibility },
            ipAddress: req.ip,
        });

        res.status(201).json(plan);
    } catch (error) {
        console.error('Error uploading workout plan:', error);
        res.status(500).json({ message: 'Error uploading workout plan: ' + error.message });
    }
};

/**
 * @desc    Delete workout plan
 * @route   DELETE /api/workout-plans/:id
 * @access  Private/Trainer/Admin
 */
const deleteWorkoutPlan = async (req, res) => {
    try {
        const plan = await WorkoutPlan.findById(req.params.id);

        if (!plan) {
            return res.status(404).json({ message: 'Workout plan not found' });
        }

        // Check authorization
        if (
            req.user.role !== 'admin' &&
            plan.trainerId.toString() !== req.user._id.toString()
        ) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Delete file from Cloudinary
        try {
            const publicId = extractPublicId(plan.fileUrl);
            await deleteFile(publicId);
        } catch (err) {
            console.error('Error deleting file from Cloudinary:', err);
        }

        // Delete plan
        await plan.deleteOne();

        // Create audit log
        await AuditLog.create({
            userId: req.user._id,
            action: 'delete_workout_plan',
            resource: 'WorkoutPlan',
            resourceId: plan._id,
            details: { title: plan.title },
            ipAddress: req.ip,
        });

        res.json({ message: 'Workout plan deleted successfully' });
    } catch (error) {
        console.error('Error deleting workout plan:', error);
        res.status(500).json({ message: 'Error deleting workout plan' });
    }
};

module.exports = {
    getWorkoutPlans,
    getWorkoutPlan,
    uploadWorkoutPlan,
    deleteWorkoutPlan,
};
