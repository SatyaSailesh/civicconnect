export function csvCell(value) {
    let text = String(value ?? '');
    // Spreadsheet applications can evaluate formulas even inside quoted CSV fields.
    if (/^[\s]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
}

export function complaintsToCsv(complaints) {
    const rows = [['ID', 'Title', 'Category', 'Status', 'Priority', 'Location', 'Citizen', 'Filed', 'Feedback']];
    for (const complaint of complaints) rows.push([
        complaint.complaintId || complaint._id, complaint.title, complaint.category, complaint.status,
        complaint.priority || 'Normal', complaint.location, complaint.user?.name,
        complaint.createdAt ? new Date(complaint.createdAt).toISOString() : '', complaint.adminFeedback,
    ]);
    return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}
