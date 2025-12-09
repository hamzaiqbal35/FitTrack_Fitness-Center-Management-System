const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
        if (!user.isActive) {
            return res.status(401).json({ message: 'Account pending approval. Please wait for admin activation.' });
        }
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            phoneNumber: user.phoneNumber,
            profile: user.profile,
            specialization: user.specialization,
            experience: user.experience,
            token: generateToken(user._id),
        });
    } else {
        res.status(401).json({ message: 'Invalid email or password' });
    }
};

// @desc    Register a new user (Member only)
// @route   POST /api/auth/signup
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
        name,
        email,
        password,
        role: 'member', // Default to member for public signup
        isActive: true // Auto-activate new members
    });

    if (user) {
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id),
        });
    } else {
        res.status(400).json({ message: 'Invalid user data' });
    }
};

// @desc    Get user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            phoneNumber: user.phoneNumber,
            profile: user.profile,
            specialization: user.specialization,
            experience: user.experience,
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

module.exports = { loginUser, registerUser, getMe };
