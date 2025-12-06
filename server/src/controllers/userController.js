const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
    const users = await User.find({});
    res.json(users);
};

// @desc    Get all trainers
// @route   GET /api/users/trainers
// @access  Public
const getTrainers = async (req, res) => {
    const trainers = await User.find({ role: 'trainer' }).select('-password');
    res.json(trainers);
};

// @desc    Create a new trainer (Admin only)
// @route   POST /api/users/trainers
// @access  Private/Admin
const createTrainer = async (req, res) => {
    const { name, email, password, specialization, experience } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
        name,
        email,
        password,
        role: 'trainer',
        specialization,
        experience,
        isActive: true,
        approvedAt: new Date(),
        approvedBy: req.user._id
    });

    if (user) {
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            specialization: user.specialization
        });
    } else {
        res.status(400).json({ message: 'Invalid user data' });
    }
};

// @desc    Update user (Admin only)
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
    const user = await User.findById(req.params.id);

    if (user) {
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        user.role = req.body.role || user.role;
        user.specialization = req.body.specialization || user.specialization;
        user.experience = req.body.experience || user.experience;
        user.isActive = req.body.isActive !== undefined ? req.body.isActive : user.isActive;

        if (req.body.password) {
            user.password = req.body.password;
        }

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            specialization: updatedUser.specialization,
            isActive: updatedUser.isActive
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
    const user = await User.findById(req.params.id);

    if (user) {
        await user.deleteOne();
        res.json({ message: 'User removed' });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        if (req.body.password) {
            user.password = req.body.password;
        }

        user.profile = {
            ...user.profile,
            ...req.body.profile
        }

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            profile: updatedUser.profile,
            token: generateToken(updatedUser._id),
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};


// @desc    Get members for a trainer (users who booked their classes)
// @route   GET /api/users/my-members
// @access  Private/Trainer
const getMyMembers = async (req, res) => {
    try {
        const Booking = require('../models/Booking');
        const Class = require('../models/Class');

        // 1. Get all classes by this trainer
        const classes = await Class.find({ trainerId: req.user._id }).select('_id');
        const classIds = classes.map(c => c._id);

        if (classIds.length === 0) {
            return res.json([]);
        }

        // 2. Get all bookings for these classes
        const bookings = await Booking.find({ classId: { $in: classIds } }).distinct('memberId');

        // 3. Get user details for these members
        const members = await User.find({ _id: { $in: bookings } }).select('name email profile');

        // Optional: Attach active plan info? For now just return users.
        // We could aggregate Subscription data too if needed.

        res.json(members);
    } catch (error) {
        console.error("Error fetching my members:", error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = { getUsers, getTrainers, createTrainer, deleteUser, updateUser, updateUserProfile, getMyMembers };
