const DietPlan = require('../models/DietPlan');
const upload = require('../middleware/uploadMiddleware');
const { uploadFile, deleteFile, extractPublicId } = require('../utils/cloudinaryService');
const AuditLog = require('../models/AuditLog');

/**
 * @desc    Get all diet plans (with visibility filtering)
 * @route   GET /api/diet-plans
 * @access  Private
 */
const getDietPlans = async (req, res) => {
    try {
        const { trainerId, tags } = req.query;

        let query = {};

        // Filter by visibility
        if (req.user.role === 'member') {
            query.$or = [
                { visibility: 'public' },
                { visibility: 'members_only' },
                // TODO: Add subscribers_only check based on user's subscription
            ];
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

        const plans = await DietPlan.find(query)
            .populate('trainerId', 'name specialization')
            .sort({ uploadedAt: -1 });

        res.json(plans);
    } catch (error) {
        console.error('Error fetching diet plans:', error);
        res.status(500).json({ message: 'Error fetching diet plans' });
    }
};

/**
 * @desc    Get diet plan by ID
 * @route   GET /api/diet-plans/:id
 * @access  Private
 */
const getDietPlan = async (req, res) => {
    try {
        const plan = await DietPlan.findById(req.params.id).populate(
            'trainerId',
            'name specialization'
        );

        if (!plan) {
            return res.status(404).json({ message: 'Diet plan not found' });
        }

        // Check visibility permissions
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
        console.error('Error fetching diet plan:', error);
        res.status(500).json({ message: 'Error fetching diet plan' });
    }
};

/**
 * @desc    Upload diet plan
 * @route   POST /api/diet-plans
 * @access  Private/Trainer/Admin
 */
const uploadDietPlan = async (req, res) => {
    try {
        const { title, description, visibility, tags, dietType, calories } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a file' });
        }

        // Upload to Cloudinary
        const fileUrl = await uploadFile(req.file.buffer, 'fittrack/diet-plans');

        // Create diet plan
        const plan = await DietPlan.create({
            trainerId: req.user._id,
            title,
            description,
            fileUrl,
            fileType: req.file.mimetype,
            visibility: visibility || 'members_only',
            tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
            dietType,
            calories: calories ? Number(calories) : 0,
        });

        // Create audit log
        await AuditLog.create({
            userId: req.user._id,
            action: 'upload_diet_plan',
            resource: 'DietPlan',
            resourceId: plan._id,
            details: { title, visibility },
            ipAddress: req.ip,
        });

        res.status(201).json(plan);
    } catch (error) {
        console.error('Error uploading diet plan:', error);
        res.status(500).json({ message: 'Error uploading diet plan' });
    }
};

/**
 * @desc    Delete diet plan
 * @route   DELETE /api/diet-plans/:id
 * @access  Private/Trainer/Admin
 */
const deleteDietPlan = async (req, res) => {
    try {
        const plan = await DietPlan.findById(req.params.id);

        if (!plan) {
            return res.status(404).json({ message: 'Diet plan not found' });
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
            action: 'delete_diet_plan',
            resource: 'DietPlan',
            resourceId: plan._id,
            details: { title: plan.title },
            ipAddress: req.ip,
        });

        res.json({ message: 'Diet plan deleted successfully' });
    } catch (error) {
        console.error('Error deleting diet plan:', error);
        res.status(500).json({ message: 'Error deleting diet plan' });
    }
};

module.exports = {
    getDietPlans,
    getDietPlan,
    uploadDietPlan,
    deleteDietPlan,
};
