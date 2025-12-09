const express = require('express');
const router = express.Router();
const { getUsers, getTrainers, createTrainer, deleteUser, updateUser, updateUserProfile, getMyMembers, deleteMyAccount } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.route('/')
    .get(protect, authorize('admin'), getUsers);

router.route('/trainers')
    .get(getTrainers)
    .post(protect, authorize('admin'), createTrainer);

router.get('/my-members', protect, authorize('trainer'), getMyMembers);

router.get('/:memberId/details', protect, authorize('trainer'), require('../controllers/userController').getMemberDetails);
router.post('/progress', protect, authorize('trainer'), require('../controllers/userController').addMemberProgress);
router.get('/:memberId/progress', protect, authorize('trainer', 'member'), require('../controllers/userController').getMemberProgress);

router.route('/profile')
    .put(protect, upload.single('avatar'), updateUserProfile)
    .delete(protect, deleteMyAccount);

router.route('/:id')
    .put(protect, authorize('admin'), updateUser)
    .delete(protect, authorize('admin'), deleteUser);

module.exports = router;
