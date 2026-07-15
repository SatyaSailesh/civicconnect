# CivicConnect – Phase 5C: Heatmaps & Advanced Map Filters

## Objective

Enhance the existing interactive complaint maps by introducing heatmap visualization and advanced filtering capabilities.

The goal is to transform the maps into a decision-support tool for administrators while maintaining the existing CivicConnect UI and user experience.

---

# IMPORTANT

This phase is an enhancement of the existing InteractiveMap component.

Do NOT redesign the dashboards.

Do NOT modify authentication.

Do NOT change complaint workflows.

Do NOT implement AI or prediction features.

Do NOT introduce WebSockets.

---

# Feature 1 — Complaint Heatmap

Integrate a Leaflet heatmap layer using leaflet.heat.

Requirements:

- Generate a heatmap from complaint latitude and longitude.
- Each complaint contributes equally to the heatmap intensity.
- Ignore complaints with invalid or missing coordinates.
- Heatmap should overlay on top of the existing map.
- Preserve all existing marker functionality.

The user should be able to switch between:

- Marker View
- Heatmap View

using a small toggle button inside the map card.

Do not open a new page.

---

# Feature 2 — Map Filters

Add filtering controls above the map.

Filters:

Status

- Pending
- In Progress
- Resolved
- Escalated
- All

Category

- Infrastructure
- Public Service
- Corruption
- Scam
- Environment
- Other
- All

Priority

- Low
- Medium
- High
- Critical
- All

Filters should update:

- markers
- clusters
- heatmap

without reloading the page.

---

# Feature 3 — Date Filter

Allow filtering complaints by:

- Last 7 Days
- Last 30 Days
- Last 90 Days
- All Time

Use existing complaint timestamps.

No backend changes should be required.

---

# Feature 4 — Statistics Panel

Display a compact analytics strip above the map showing:

Visible Complaints

Pending

Resolved

Escalated

Categories Represented

These values should update instantly as filters change.

---

# Feature 5 — Search

Add a search input above the filters.

Search by:

- Tracking ID
- Complaint Title
- Location

Search should work together with filters.

---

# Feature 6 — Smooth UX

Changing filters must:

- Update markers instantly
- Update clusters instantly
- Update heatmap instantly
- Preserve current zoom level
- Preserve current map position

Do not reset the map.

---

# Performance

Reuse existing complaint data.

Do not perform new API requests.

Avoid unnecessary React renders.

Reuse existing MarkerClusterGroup.

Properly clean up heatmap layers.

---

# UI

Follow the current CivicConnect design.

Keep:

- Glassmorphic cards
- Existing color palette
- Existing typography

Do not redesign dashboards.

---

# Verification

Citizen Dashboard

- Only own complaints visible.
- Heatmap works.
- Filters work.
- Search works.

Admin Dashboard

- All complaints visible.
- Heatmap works.
- Filters work.
- Search works.

General

- npm run build succeeds.
- No console errors.
- No regressions.
- Existing marker clustering continues to work.

---

# Deliverables

Provide:

1. Files modified.
2. Dependencies added.
3. Summary of implementation.
4. Verification performed.
5. Confirmation that no functionality outside Phase 5C was changed.