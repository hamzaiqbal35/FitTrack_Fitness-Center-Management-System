const Booking = require('../models/Booking');
const Class = require('../models/Class');
const User = require('../models/User');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');
const { sendBookingConfirmation, sendBookingCancellation } = require('../utils/emailService');

/**
 * @desc    Book a class with atomic capacity check
 * @route   POST /api/classes/:classId/book
 * @access  Private/Member
 */
const bookClass = async (req, res) => {
    try {
        const { classId } = req.params;

        // Get initial class details
        const initialClass = await Class.findById(classId).populate('trainerId', 'name');

        if (!initialClass) {
            return res.status(404).json({ message: 'Class not found' });
        }

        // --- COURSE LIMIT CHECK START ---

        // 1. Get User's Active Subscription & Plan
        const subscription = await Subscription.findOne({
            userId: req.user._id,
            status: { $in: ['active', 'trialing', 'incomplete'] }
        }).populate('planId');

        if (!subscription) {
            return res.status(403).json({ message: 'Active subscription required to book classes' });
        }

        const planLimit = subscription.planId.classesPerMonth || 0; // 0 means unlimited

        if (planLimit > 0) {
            // 2. Get User's Current Active Bookings
            const myBookings = await Booking.find({
                memberId: req.user._id,
                status: 'booked'
            }).populate('classId');

            // 3. Count Unique "Courses"
            const enrolledRecurrenceGroups = new Set();
            const enrolledStandaloneClasses = new Set();

            myBookings.forEach(booking => {
                if (!booking.classId) return; // stale data

                if (booking.classId.recurrenceGroupId) {
                    enrolledRecurrenceGroups.add(booking.classId.recurrenceGroupId.toString());
                } else {
                    enrolledStandaloneClasses.add(booking.classId._id.toString());
                }
            });

            const currentCourseCount = enrolledRecurrenceGroups.size + enrolledStandaloneClasses.size;

            // 4. Check if Current Request is a NEW Course
            let isNewCourse = true;
            if (initialClass.recurrenceGroupId) {
                if (enrolledRecurrenceGroups.has(initialClass.recurrenceGroupId.toString())) {
                    isNewCourse = false;
                }
            } else {
                if (enrolledStandaloneClasses.has(initialClass._id.toString())) {
                    isNewCourse = false;
                }
            }

            // 5. Enforce Limit
            if (isNewCourse && currentCourseCount >= planLimit) {
                return res.status(403).json({
                    message: `Course limit reached. Your plan allows ${planLimit} courses. You are currently enrolled in ${currentCourseCount}. Unbook an existing course to join a new one.`,
                    currentCount: currentCourseCount,
                    limit: planLimit
                });
            }
        }
        // --- COURSE LIMIT CHECK END ---

        // Determine classes to book: either just this one, or the whole series if recurring
        let classesToBook = [initialClass];

        if (initialClass.recurrenceGroupId) {
            // Find all future classes in this series, starting from this one
            const seriesClasses = await Class.find({
                recurrenceGroupId: initialClass.recurrenceGroupId,
                startTime: { $gte: initialClass.startTime }, // Only future/current ones
                status: 'scheduled'
            }).populate('trainerId', 'name');

            if (seriesClasses.length > 0) {
                classesToBook = seriesClasses;
            }
        }

        const results = [];
        let anyWaitlisted = false;

        for (const classData of classesToBook) {
            // Check if already booked
            const existingBooking = await Booking.findOne({
                memberId: req.user._id,
                classId: classData._id,
            });

            if (existingBooking) {
                results.push({ classId: classData._id, status: 'already_booked', message: 'Already booked' });
                continue;
            }

            if (classData.status !== 'scheduled') {
                results.push({ classId: classData._id, status: 'error', message: 'Not scheduled' });
                continue;
            }

            // Atomic capacity check and booking
            const updatedClass = await Class.findOneAndUpdate(
                {
                    _id: classData._id,
                    status: 'scheduled',
                    $expr: { $lt: [{ $size: '$attendees' }, '$capacity'] },
                },
                {
                    $addToSet: { attendees: req.user._id },
                },
                { new: true }
            );

            if (!updatedClass) {
                // Class is full, add to waitlist
                const waitlistClass = await Class.findOneAndUpdate(
                    {
                        _id: classData._id,
                        status: 'scheduled',
                    },
                    {
                        $addToSet: { waitlist: req.user._id },
                    },
                    { new: true }
                );

                if (waitlistClass) {
                    await Notification.create({
                        userId: req.user._id,
                        type: 'waitlist_added',
                        title: 'Added to Waitlist',
                        message: `You have been added to the waitlist for "${classData.name}" on ${classData.startTime.toLocaleDateString()}.`,
                    });
                    results.push({ classId: classData._id, status: 'waitlisted', message: 'Class full, waitlisted' });
                    anyWaitlisted = true;
                } else {
                    results.push({ classId: classData._id, status: 'error', message: 'Failed to join waitlist' });
                }
                continue;
            }

            // Create booking record
            const booking = await Booking.create({
                memberId: req.user._id,
                classId: classData._id,
                status: 'booked',
            });

            // Create notification (maybe only for the first one to avoid spam? or all? sticking to all for now or user might miss dates)
            // Let's create one notification for the first one, or maybe just log it.
            // If it's a series, maybe reduce noise. But existing logic is 1 notification per booking. 
            // I'll keep it per booking for now so they have record.

            await Notification.create({
                userId: req.user._id,
                type: 'booking_confirmed',
                title: 'Booking Confirmed',
                message: `Your booking for "${classData.name}" on ${classData.startTime.toLocaleString()} has been confirmed.`,
            });

            // We can send email async
            sendBookingConfirmation(
                booking,
                {
                    name: classData.name,
                    trainerName: classData.trainerId.name,
                    startTime: classData.startTime,
                    location: classData.location,
                },
                req.user
            ).catch(err => console.error("Email error", err));

            results.push({ classId: classData._id, status: 'booked', bookingId: booking._id });
        }

        // Response
        if (classesToBook.length === 1) {
            // Backward compatibility response for single booking
            const resData = results[0];
            if (resData.status === 'booked') {
                return res.status(201).json({ message: 'Class booked successfully', booking: { _id: resData.bookingId, ...initialClass.toObject() } }); // Mocking booking retrieval simplicity
            } else if (resData.status === 'waitlisted') {
                return res.status(200).json({ message: 'Class is full. Added to waitlist.', waitlisted: true });
            } else if (resData.status === 'already_booked') {
                return res.status(400).json({ message: 'You have already booked this class' });
            }
        }

        res.status(201).json({
            message: `Processed ${classesToBook.length} bookings.`,
            results,
            waitlisted: anyWaitlisted
        });

    } catch (error) {
        console.error('Error booking class:', error);
        res.status(500).json({ message: 'Error booking class' });
    }
};

/**
 * @desc    Get my bookings
 * @route   GET /api/bookings/my-bookings
 * @access  Private/Member
 */
const getMyBookings = async (req, res) => {
    try {
        const { status, upcoming } = req.query;

        const query = { memberId: req.user._id };

        if (status) query.status = status;

        const bookings = await Booking.find(query)
            .populate('classId')
            .populate({
                path: 'classId',
                populate: { path: 'trainerId', select: 'name specialization' },
            })
            .sort({ createdAt: -1 });

        // Filter upcoming if requested
        let filteredBookings = bookings;
        if (upcoming === 'true') {
            filteredBookings = bookings.filter(
                booking => booking.classId && new Date(booking.classId.startTime) > new Date()
            );
        }

        res.json(filteredBookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ message: 'Error fetching bookings' });
    }
};

/**
 * @desc    Get booking by ID
 * @route   GET /api/bookings/:id
 * @access  Private/Member
 */
const getBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('classId')
            .populate('memberId', 'name email');

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Verify ownership
        if (booking.memberId._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        res.json(booking);
    } catch (error) {
        console.error('Error fetching booking:', error);
        res.status(500).json({ message: 'Error fetching booking' });
    }
};

/**
 * @desc    Cancel booking
 * @route   PUT /api/bookings/:id/cancel
 * @access  Private/Member
 */
const cancelBooking = async (req, res) => {
    try {
        const { reason } = req.body;
        const booking = await Booking.findById(req.params.id).populate('classId');

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Verify ownership
        if (booking.memberId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (booking.status !== 'booked') {
            return res.status(400).json({ message: 'Booking cannot be cancelled' });
        }

        // Check cancellation cutoff time
        const cancellationHours = parseInt(process.env.BOOKING_CANCELLATION_HOURS) || 2;
        const hoursUntilClass =
            (new Date(booking.classId.startTime) - new Date()) / (1000 * 60 * 60);

        if (hoursUntilClass < cancellationHours) {
            return res.status(400).json({
                message: `Cancellations must be made at least ${cancellationHours} hours before class start time`,
            });
        }

        // Remove from class attendees atomically
        await Class.findByIdAndUpdate(booking.classId._id, {
            $pull: { attendees: req.user._id },
        });

        // Update booking status
        booking.status = 'cancelled';
        booking.cancelledAt = new Date();
        booking.cancellationReason = reason || 'Cancelled by member';
        await booking.save();

        // Check waitlist and promote first person
        const classData = await Class.findById(booking.classId._id);
        if (classData.waitlist.length > 0) {
            const nextMemberId = classData.waitlist[0];

            // Remove from waitlist and add to attendees atomically
            await Class.findByIdAndUpdate(classData._id, {
                $pull: { waitlist: nextMemberId },
                $addToSet: { attendees: nextMemberId },
            });

            // Create booking for waitlisted member
            const newBooking = await Booking.create({
                memberId: nextMemberId,
                classId: classData._id,
                status: 'booked',
            });

            // Notify promoted member
            await Notification.create({
                userId: nextMemberId,
                type: 'waitlist_promoted',
                title: 'Spot Available!',
                message: `A spot has opened up for "${classData.name}" on ${classData.startTime.toLocaleString()}. Your booking has been confirmed!`,
            });

            // Send email to promoted member
            const promotedUser = await User.findById(nextMemberId);
            await sendBookingConfirmation(
                newBooking,
                {
                    name: classData.name,
                    trainerName: classData.trainerId?.name || 'Trainer',
                    startTime: classData.startTime,
                    location: classData.location,
                },
                promotedUser
            );
        }

        // Send cancellation email
        await sendBookingCancellation(
            booking,
            {
                name: booking.classId.name,
                startTime: booking.classId.startTime,
            },
            req.user
        );

        // Create audit log
        await AuditLog.create({
            userId: req.user._id,
            action: 'cancel_booking',
            resource: 'Booking',
            resourceId: booking._id,
            details: { classId: booking.classId._id, reason },
            ipAddress: req.ip,
        });

        res.json({ message: 'Booking cancelled successfully', booking });
    } catch (error) {
        console.error('Error cancelling booking:', error);
        res.status(500).json({ message: 'Error cancelling booking' });
    }
};

/**
 * @desc    Generate QR token for booking
 * @route   POST /api/bookings/:id/generate-qr
 * @access  Private/Member
 */
const generateQRToken = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id).populate('classId');

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Verify ownership
        if (booking.memberId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (booking.status !== 'booked') {
            return res.status(400).json({ message: 'Booking is not active' });
        }

        // Generate QR token
        const qrService = require('../utils/qrService');
        const { token, expiresAt } = await qrService.generateToken(
            booking._id.toString(),
            booking.classId._id.toString(),
            req.user._id.toString()
        );

        // Update booking with token expiry
        booking.qrTokenExpiry = expiresAt;
        await booking.save();

        // Generate QR URL
        const qrUrl = `${process.env.FRONTEND_URL}/checkin?c=${booking.classId._id}&b=${booking._id}&t=${token}`;

        res.json({
            token,
            qrUrl,
            expiresAt,
        });
    } catch (error) {
        console.error('Error generating QR token:', error);
        res.status(500).json({ message: 'Error generating QR token' });
    }
};

/**
 * @desc    Unbook entire course (recurrence group)
 * @route   PUT /api/bookings/unbook-course/:classId
 * @access  Private/Member
 */
const unbookCourse = async (req, res) => {
    try {
        const { classId } = req.params;
        const { reason } = req.body;

        // Find the class to get recurrence details
        // We use the classId passed (likely the one they clicked on) to find the group
        const initialClass = await Class.findById(classId);

        if (!initialClass) {
            return res.status(404).json({ message: 'Class not found' });
        }

        let bookingsToCancel = [];

        // Find all active bookings for this user...
        const query = {
            memberId: req.user._id,
            status: 'booked',
        };

        if (initialClass.recurrenceGroupId) {
            // ...that are part of this recurrence group
            // We need to find classes in this group first
            const courseClasses = await Class.find({ recurrenceGroupId: initialClass.recurrenceGroupId }, '_id');
            const courseClassIds = courseClasses.map(c => c._id);

            query.classId = { $in: courseClassIds };
        } else {
            // ...or just this single class if not recurring (fallback)
            query.classId = initialClass._id;
        }

        // Get the bookings
        const bookings = await Booking.find(query).populate('classId');

        // Filter only future bookings (optional? usually unbooking a course means "from now on")
        // But let's cancel ALL 'booked' status ones. Past ones should be 'completed' or 'no_show'.
        // If they are 'booked' in the past, it means attendance wasn't taken.
        // Let's cancel only future ones to be safe and keep history?
        // User request: "unbook the complete class (course)"
        // Typically this means future.
        // Filter bookings:
        // 1. Always include the specific class the user clicked on (classId), even if it just started.
        // 2. Include all strictly future bookings for the group.
        const now = new Date();
        bookingsToCancel = bookings.filter(b => {
            if (!b.classId) return false;
            // Matches target class OR is in the future
            return b.classId._id.toString() === classId || new Date(b.classId.startTime) > now;
        });

        if (bookingsToCancel.length === 0) {
            return res.status(400).json({ message: 'No active or future bookings found for this course.' });
        }

        let cancelledCount = 0;

        for (const booking of bookingsToCancel) {
            // Use existing cancellation logic per booking to handle waitlists/capacity updates correctly
            // Copy-pasting core logic or refactoring is ideal. For speed, I'll replicate the core update steps.

            // Remove from class attendees
            await Class.findByIdAndUpdate(booking.classId._id, {
                $pull: { attendees: req.user._id },
            });

            // Update booking status
            booking.status = 'cancelled';
            booking.cancelledAt = new Date();
            booking.cancellationReason = reason || 'Unbooked course';
            await booking.save();

            // Handle Waitlist Promotion (Simulated for each)
            const classData = await Class.findById(booking.classId._id);
            if (classData.waitlist.length > 0) {
                const nextMemberId = classData.waitlist[0];
                await Class.findByIdAndUpdate(classData._id, {
                    $pull: { waitlist: nextMemberId },
                    $addToSet: { attendees: nextMemberId },
                });
                await Booking.create({
                    memberId: nextMemberId,
                    classId: classData._id,
                    status: 'booked',
                });
                // Notification/Email would go here (skipped for bulk op to avoid spam, or sent as batch)
                // For simplified UX, we skip detailed notifications for waitlist promotion in bulk unbook for now
                // OR we should ideally do it.
                await Notification.create({
                    userId: nextMemberId,
                    type: 'waitlist_promoted',
                    title: 'Spot Available!',
                    message: `A spot has opened up for "${classData.name}". Your booking is confirmed.`,
                });
            }

            cancelledCount++;
        }

        res.json({ message: `Successfully unbooked ${cancelledCount} sessions from the course.` });

    } catch (error) {
        console.error('Error unbooking course:', error);
        res.status(500).json({ message: 'Error unbooking course' });
    }
};

module.exports = {
    bookClass,
    getMyBookings,
    getBooking,
    cancelBooking,
    unbookCourse,
    generateQRToken,
};
