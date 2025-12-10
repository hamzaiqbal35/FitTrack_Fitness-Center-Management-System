const mongoose = require('mongoose');
const Class = require('../models/Class');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const { sendBookingConfirmation } = require('../utils/emailService');
const { checkAvailability } = require('../utils/availabilityUtils');
const User = require('../models/User');

/**
 * @desc    Get all classes with filters
 * @route   GET /api/classes
 * @access  Public
 */
const getClasses = async (req, res) => {
    try {
        const { status, trainerId, startDate, endDate, available } = req.query;

        const query = {};

        if (status) query.status = status;
        if (trainerId) query.trainerId = trainerId;
        if (startDate || endDate) {
            query.startTime = {};
            if (startDate) query.startTime.$gte = new Date(startDate);
            if (endDate) query.startTime.$lte = new Date(endDate);
        }

        let classes = await Class.find(query)
            .populate('trainerId', 'name specialization email')
            .sort({ startTime: 1 });

        // Filter by availability if requested
        if (available === 'true') {
            classes = classes.filter(cls => cls.attendees.length < cls.capacity);
        }

        res.json(classes);
    } catch (error) {
        console.error('Error fetching classes:', error);
        res.status(500).json({ message: 'Error fetching classes' });
    }
};

/**
 * @desc    Get single class
 * @route   GET /api/classes/:id
 * @access  Public
 */
const getClassById = async (req, res) => {
    try {
        const classData = await Class.findById(req.params.id)
            .populate('trainerId', 'name specialization email')
            .populate('attendees', 'name email')
            .populate('waitlist', 'name email');

        if (!classData) {
            return res.status(404).json({ message: 'Class not found' });
        }

        res.json(classData);
    } catch (error) {
        console.error('Error fetching class:', error);
        res.status(500).json({ message: 'Error fetching class' });
    }
};

/**
 * @desc    Create a class (Trainer)
 * @route   POST /api/classes
 * @access  Private/Trainer/Admin
 */
const createClass = async (req, res) => {
    try {
        const { name, description, startTime, endTime, duration, capacity, location, isRecurring, recurrenceCount } = req.body;

        // Validation
        if (!name || !description || !startTime || !endTime || !duration || !capacity || !location) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        const initialStart = new Date(startTime);
        const initialEnd = new Date(endTime);

        if (isNaN(initialStart.getTime()) || isNaN(initialEnd.getTime())) {
            return res.status(400).json({ message: 'Invalid start or end time format' });
        }

        if (initialStart >= initialEnd) {
            return res.status(400).json({ message: 'Start time must be before end time' });
        }

        // Validate admin role
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can create classes' });
        }

        const { trainerId } = req.body;
        if (!trainerId) {
            return res.status(400).json({ message: 'Please assign a trainer to this class' });
        }

        // Check trainer availability
        const trainer = await User.findById(trainerId);
        if (!trainer) {
            return res.status(404).json({ message: 'Trainer not found' });
        }

        if (!checkAvailability(trainer.availability, initialStart, initialEnd)) {
            return res.status(400).json({
                message: `Trainer is not available at this time. Please check ${trainer.name}'s availability logic.`
            });
        }


        const classesToCreate = [];
        const numberOfClasses = isRecurring ? (parseInt(recurrenceCount) || 1) : 1;
        const recurrenceGroupId = isRecurring ? new mongoose.Types.ObjectId() : undefined;

        for (let i = 0; i < numberOfClasses; i++) {
            const currentStart = new Date(initialStart);
            currentStart.setDate(initialStart.getDate() + (i * 7)); // Weekly recurrence

            const currentEnd = new Date(initialEnd);
            currentEnd.setDate(initialEnd.getDate() + (i * 7));

            // Check for conflicting classes for this specific slot
            const conflictingClass = await Class.findOne({
                trainerId: trainerId,
                status: 'scheduled',
                $or: [
                    {
                        startTime: { $lte: currentStart },
                        endTime: { $gt: currentStart },
                    },
                    {
                        startTime: { $lt: currentEnd },
                        endTime: { $gte: currentEnd },
                    },
                    {
                        startTime: { $gte: currentStart },
                        endTime: { $lte: currentEnd },
                    },
                ],
            });

            if (conflictingClass) {
                // If one conflicts, we can either fail all or skip. Failing all is safer.
                return res.status(400).json({
                    message: `Conflict detected for occurrence #${i + 1} (${currentStart.toLocaleDateString()}). Trainer has another class.`,
                    conflictingClass,
                });
            }

            classesToCreate.push({
                name,
                description,
                startTime: currentStart,
                endTime: currentEnd,
                duration,
                capacity,
                location,
                trainerId: trainerId,
                recurrenceGroupId: recurrenceGroupId
            });
        }

        const createdClasses = await Class.insertMany(classesToCreate);

        // Create audit log (summary)
        try {
            await AuditLog.create({
                userId: req.user._id,
                action: 'create_class_batch',
                resource: 'Class',
                resourceId: createdClasses[0]._id, // Reference the first one
                details: { name, count: createdClasses.length, recurrence: isRecurring },
                ipAddress: req.ip,
            });
        } catch (auditError) {
            console.error("Failed to create audit log:", auditError);
        }

        res.status(201).json(isRecurring ? createdClasses : createdClasses[0]);
    } catch (error) {
        console.error('Error creating class:', error);
        res.status(500).json({ message: 'Error creating class: ' + error.message });
    }
};

/**
 * @desc    Update a class
 * @route   PUT /api/classes/:id
 * @access  Private/Trainer/Admin (Owner)
 */
const updateClass = async (req, res) => {
    try {
        const { name, description, startTime, endTime, duration, capacity, location } = req.body;
        const classData = await Class.findById(req.params.id);

        if (!classData) {
            return res.status(404).json({ message: 'Class not found' });
        }

        // Check authorization
        if (
            req.user.role !== 'admin' &&
            classData.trainerId.toString() !== req.user._id.toString()
        ) {
            return res.status(403).json({ message: 'Not authorized to update this class' });
        }

        if (location) classData.location = location;

        // Prevent editing if class has ended
        if (new Date() > new Date(classData.endTime)) {
            return res.status(400).json({ message: 'Cannot edit a class that has already ended' });
        }

        // Handle trainer reassignment
        if (req.body.trainerId && req.body.trainerId !== classData.trainerId.toString()) {
            // Validate admin if changing trainer? Already checked above.
            classData.trainerId = req.body.trainerId;
            // Re-check conflicts for NEW trainer
            // This is complex because we need to check if we are changing time too.
        }

        // Re-check conflicts if time OR trainer changed
        const targetTrainerId = req.body.trainerId || classData.trainerId;

        if (startTime || endTime || req.body.trainerId) {
            const newStartTime = startTime ? new Date(startTime) : classData.startTime;
            const newEndTime = endTime ? new Date(endTime) : classData.endTime;

            const conflictingClass = await Class.findOne({
                _id: { $ne: classData._id },
                trainerId: targetTrainerId,
                status: 'scheduled',
                $or: [
                    {
                        startTime: { $lte: newStartTime },
                        endTime: { $gte: newStartTime },
                    },
                    {
                        startTime: { $lte: newEndTime },
                        endTime: { $gte: newEndTime },
                    },
                    {
                        startTime: { $gte: newStartTime },
                        endTime: { $lte: newEndTime },
                    },
                ],
            });

            if (conflictingClass) {
                return res.status(400).json({
                    message: 'Trainer has a conflicting class at this time',
                    conflictingClass,
                });
            }

            // Check availability for valid working hours
            const trainer = await User.findById(targetTrainerId);
            if (!checkAvailability(trainer.availability, newStartTime, newEndTime)) {
                return res.status(400).json({
                    message: `Trainer is not available at this time.`
                });
            }
        }


        if (name) classData.name = name;
        if (description) classData.description = description;
        if (startTime) classData.startTime = new Date(startTime);
        if (endTime) classData.endTime = new Date(endTime);
        if (duration) classData.duration = duration;

        // Recalculate endTime if duration changed but endTime didn't (or safeguard)
        if (duration && !endTime && startTime) {
            const start = new Date(startTime);
            classData.endTime = new Date(start.getTime() + duration * 60000);
        } else if (duration && !endTime && !startTime) {
            const start = new Date(classData.startTime);
            classData.endTime = new Date(start.getTime() + duration * 60000);
        }

        // Fix for legacy records: If duration is missing, calculate it
        if (!classData.duration) {
            const start = classData.startTime.getTime();
            const end = classData.endTime.getTime();
            classData.duration = Math.round((end - start) / 60000);
        }

        if (capacity) classData.capacity = capacity;

        await classData.save();

        // Create audit log
        await AuditLog.create({
            userId: req.user._id,
            action: 'update_class',
            resource: 'Class',
            resourceId: classData._id,
            details: req.body,
            ipAddress: req.ip,
        });

        res.json(classData);
    } catch (error) {
        console.error('Error updating class:', error);
        res.status(500).json({ message: 'Error updating class' });
    }
};

/**
 * @desc    Cancel/Delete a class
 * @route   DELETE /api/classes/:id
 * @access  Private/Trainer/Admin (Owner)
 */
const deleteClass = async (req, res) => {
    try {
        const classData = await Class.findById(req.params.id);

        if (!classData) {
            return res.status(404).json({ message: 'Class not found' });
        }

        // Check authorization
        if (
            req.user.role !== 'admin' &&
            classData.trainerId.toString() !== req.user._id.toString()
        ) {
            return res.status(403).json({ message: 'Not authorized to delete this class' });
        }

        // Mark as cancelled instead of deleting
        classData.status = 'cancelled';
        await classData.save();

        // Notify all attendees
        const bookings = await Booking.find({ classId: classData._id, status: 'booked' });
        for (const booking of bookings) {
            await Notification.create({
                userId: booking.memberId,
                type: 'class_cancelled',
                title: 'Class Cancelled',
                message: `The class "${classData.name}" scheduled for ${classData.startTime.toLocaleString()} has been cancelled.`,
            });

            // Update booking status
            booking.status = 'cancelled';
            booking.cancelledAt = new Date();
            booking.cancellationReason = 'Class cancelled by trainer';
            await booking.save();
        }

        // Create audit log
        await AuditLog.create({
            userId: req.user._id,
            action: 'cancel_class',
            resource: 'Class',
            resourceId: classData._id,
            details: { name: classData.name, attendeesCount: bookings.length },
            ipAddress: req.ip,
        });

        res.json({ message: 'Class cancelled successfully', class: classData });
    } catch (error) {
        console.error('Error cancelling class:', error);
        res.status(500).json({ message: 'Error cancelling class' });
    }
};

/**
 * @desc    Mark class as completed
 * @route   PUT /api/classes/:id/complete
 * @access  Private/Trainer (Owner)
 */
const completeClass = async (req, res) => {
    try {
        const classData = await Class.findById(req.params.id);

        if (!classData) {
            return res.status(404).json({ message: 'Class not found' });
        }

        // Check authorization
        if (classData.trainerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (classData.status !== 'scheduled') {
            return res.status(400).json({ message: 'Class is not scheduled' });
        }

        // Mark as completed
        classData.status = 'completed';
        await classData.save();

        // Update all checked-in bookings to completed
        await Booking.updateMany(
            { classId: classData._id, status: 'checked_in' },
            { status: 'completed' }
        );

        // Mark no-shows
        await Booking.updateMany(
            { classId: classData._id, status: 'booked' },
            { status: 'no_show' }
        );

        res.json({ message: 'Class marked as completed', class: classData });
    } catch (error) {
        console.error('Error completing class:', error);
        res.status(500).json({ message: 'Error completing class' });
    }
};

module.exports = {
    getClasses,
    getClassById,
    createClass,
    updateClass,
    deleteClass,
    completeClass,
};
