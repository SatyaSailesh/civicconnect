const ROUTES = (() => {
    try {
        const value = JSON.parse(process.env.DEPARTMENT_ROUTING_JSON || '[]');
        if (!Array.isArray(value)) throw new Error('Expected an array');
        return value.filter(route => route && typeof route === 'object'
            && ['Infrastructure', 'Corruption', 'Scam', 'Public Service'].includes(route.category)
            && typeof route.city === 'string' && typeof route.state === 'string'
            && typeof route.department === 'string' && typeof route.jurisdiction === 'string'
            && route.city.trim() && route.state.trim() && route.department.trim() && route.jurisdiction.trim());
    } catch { console.error('Invalid DEPARTMENT_ROUTING_JSON; unmatched complaints will need review.'); return []; }
})();

function routeComplaint(complaint) {
    const matches = ROUTES.filter(route => route.category === complaint.category
        && route.city.trim().toLowerCase() === String(complaint.city || '').trim().toLowerCase()
        && route.state.trim().toLowerCase() === String(complaint.state || '').trim().toLowerCase());
    if (matches.length !== 1) return { assignedDepartment: '', jurisdiction: '', routingStatus: 'review', routingSource: 'unmatched' };
    const match = matches[0];
    if (match.demo === true) return { assignedDepartment: match.department.trim(), jurisdiction: match.jurisdiction.trim(), routingStatus: 'review', routingSource: 'demo' };
    if (match.verified !== true) return { assignedDepartment: '', jurisdiction: '', routingStatus: 'review', routingSource: 'unmatched' };
    return { assignedDepartment: match.department.trim(), jurisdiction: match.jurisdiction.trim(), routingStatus: 'routed', routingSource: 'verified' };
}

module.exports = { routeComplaint };
