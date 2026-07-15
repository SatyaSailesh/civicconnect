# CivicConnect – Phase 5A: Interactive Complaint Maps

## Objective

Upgrade the Citizen Dashboard and Admin Dashboard by replacing the current static globe visualization with a professional interactive map while preserving the existing UI and functionality.

This phase focuses ONLY on displaying complaint locations on an interactive map.

---

# IMPORTANT RULES

## DO NOT

- Do NOT redesign the application.
- Do NOT change colors.
- Do NOT change typography.
- Do NOT change spacing.
- Do NOT modify navigation.
- Do NOT remove any cards.
- Do NOT modify existing complaint workflows.
- Do NOT implement clustering.
- Do NOT implement heatmaps.
- Do NOT implement filters.
- Do NOT implement live polling/websockets.
- Do NOT modify authentication.
- Do NOT change backend architecture unnecessarily.

The application should look like an upgraded version of the existing CivicConnect, not a different project.

---

# Preferred Technology

Use one of the following:

- Leaflet + React Leaflet (Preferred)
OR
- MapLibre

Use OpenStreetMap tiles.

The implementation should require minimal API keys and remain easy to deploy.

---

# Citizen Dashboard

Replace ONLY the existing globe section.

Everything else remains unchanged.

The map should:

- Display ONLY complaints created by the logged-in citizen.
- Automatically center around the citizen's complaints.
- Automatically adjust zoom to include all complaint markers.
- Display one marker per complaint.

Marker colors:

- Pending → Orange
- In Progress → Blue
- Resolved → Green
- Escalated → Red

Clicking a marker should open a popup containing:

- Complaint Tracking ID
- Complaint Title
- Category
- Current Status
- Priority
- Date Created

Do not redesign the popup.

Keep it clean and professional.

---

# Admin Dashboard

Replace ONLY the current globe section.

Everything else remains unchanged.

Display markers for ALL complaints stored in the database.

Clicking a marker should display:

- Complaint ID
- Citizen Name
- Category
- Status
- Priority
- Created Date

Keep the popup compact.

---

# Backend

If existing APIs already return coordinates,
reuse them.

Only create new APIs if absolutely necessary.

Return only:

- latitude
- longitude
- complaintId
- title
- status
- priority
- category
- createdAt
- citizenName (Admin only)

Avoid unnecessary database fields.

---

# Error Handling

If a complaint does not contain coordinates:

- Skip rendering the marker.
- Do not crash the application.

If there are no complaints:

Display the existing empty state.

Do not show map errors.

---

# Performance

Load map libraries lazily if practical.

Avoid unnecessary API calls.

Do not repeatedly fetch the same data.

Use existing dashboard fetch logic whenever possible.

---

# UI Requirements

The map should blend naturally into the existing dashboard.

Keep:

- Existing statistics
- Existing cards
- Existing charts
- Existing activity timeline
- Existing complaint lists

Only replace the current globe visualization.

No additional sidebars.

No floating controls beyond standard zoom controls.

---

# Verification Checklist

## Citizen Dashboard

- Dashboard loads successfully.
- Interactive map replaces the globe.
- Only the logged-in citizen's complaints are shown.
- Marker colors match complaint status.
- Clicking a marker opens complaint details.
- Auto-centering works correctly.

## Admin Dashboard

- Dashboard loads successfully.
- Interactive map replaces the globe.
- All complaints are visible.
- Clicking a marker displays complaint details.
- Existing dashboard functionality remains unchanged.

## General

- Backend starts successfully.
- Frontend starts successfully.
- No console errors.
- No UI redesign.
- No broken functionality.
- Existing complaint submission continues working.

---

# Deliverables

Provide:

1. Files modified.
2. New dependencies installed.
3. APIs created or reused.
4. Summary of implementation.
5. Verification performed.

Do NOT implement Phase 5B, Phase 5C, or Phase 5D.

Implement ONLY Phase 5A.