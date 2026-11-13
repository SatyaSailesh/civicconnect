const PUBLIC_FIELDS = 'complaintId title description category location city district state lat lng status priority escalationLevel adminFeedback images rating ratingComment isPublic createdAt user assignedDepartment jurisdiction routingStatus routingSource withdrawnAt';
const visibleTo = user => user.role === 'admin' ? {} : { $or: [{ user: user.id }, { isPublic: true }] };
function areaQuery(query = {}) {
    const result = {};
    for (const key of ['city', 'state']) {
        if (typeof query[key] === 'string' && query[key].trim()) {
            const value = query[key].trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            result[key] = new RegExp(`^${value}$`, 'i');
        }
    }
    return result;
}
function publicQuery(query = {}) { return { isPublic: true, ...areaQuery(query) }; }
module.exports = { PUBLIC_FIELDS, visibleTo, areaQuery, publicQuery };
