const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Check if a time range falls within the trainer's availability
 * @param {Array} availability - Trainer's availability array
 * @param {Date} startTime - Class start time
 * @param {Date} endTime - Class end time
 * @returns {boolean} - True if available, false if not
 */
const checkAvailability = (availability, startTime, endTime) => {
    if (!availability || availability.length === 0) return true; // Assume available if not set? Or strict? Usually Assume available.

    const date = new Date(startTime);
    const dayName = days[date.getDay()];

    // Find availability for this day
    const dayAvail = availability.find(a => a.day === dayName);

    if (!dayAvail || !dayAvail.isAvailable) {
        return false; // Not available on this day
    }

    // Check time range
    // Format: "HH:MM"
    const classStart = date.getHours() * 60 + date.getMinutes();
    const classEnd = new Date(endTime).getHours() * 60 + new Date(endTime).getMinutes();

    const [availStartHour, availStartMin] = dayAvail.startTime.split(':').map(Number);
    const [availEndHour, availEndMin] = dayAvail.endTime.split(':').map(Number);

    const availStart = availStartHour * 60 + availStartMin;
    const availEnd = availEndHour * 60 + availEndMin;

    if (classStart < availStart || classEnd > availEnd) {
        return false;
    }

    return true;
};

module.exports = { checkAvailability };
