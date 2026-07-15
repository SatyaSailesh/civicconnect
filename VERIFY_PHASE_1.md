# CivicConnect — Phase 1 Tracking ID Verification

Verify the Complaint Tracking ID system is implemented correctly. Read-only — do not modify any files.

---

## REQUIREMENT 1 — Unique Tracking ID Format

Check backend/models/Complaint.js:
- Does the Complaint schema have a `complaintId` field?
- Is there a pre-save hook that generates IDs in format `CC-YYYY-XXXXXX` (e.g., CC-2026-000001)?
- Does it use a Counter collection in MongoDB?

Report: PASS/FAIL — show the exact pre-save hook code if it exists.

---

## REQUIREMENT 2 — New Complaints Get Tracking IDs

Check backend/routes/complaintRoutes.js POST / route:
- Does it create a new complaint?
- Is the tracking ID automatically assigned (not manually)?
- Does it save to MongoDB successfully?

Report: PASS/FAIL — show line numbers where complaint is created and saved.

---

## REQUIREMENT 3 — Tracking ID Stored in MongoDB

Check the Complaint.js schema:
- Is `complaintId` a String field?
- Is it indexed for fast lookup?
- Is it required or optional?

Report: PASS/FAIL — show the field definition.

---

## REQUIREMENT 4 — Tracking ID Display in UI

Check these frontend files for the tracking ID being displayed (look for complaintId or complaint._id display):
- frontend/src/components/ComplaintCard.jsx — does it show tracking ID?
- frontend/src/pages/CitizenDashboard.jsx — does it show tracking ID in complaint list?
- frontend/src/pages/AdminDashboard.jsx — does it show tracking ID in complaint table?
- frontend/src/pages/PublicFeedPage.jsx — does it show tracking ID?

Report: PASS/FAIL for each file — show the exact line where tracking ID is displayed (search for <span> or <p> or <div> containing complaintId).

---

## REQUIREMENT 5 — Backend API Endpoint

Check backend/routes/complaintRoutes.js:
- Does a GET /complaints/track/:trackingId route exist?
- Does it query by complaintId (not _id)?
- Does it return 404 if not found?
- Does it return 403 if citizen tries to access another citizen's complaint?

Report: PASS/FAIL — show the exact route handler code.

---

## REQUIREMENT 6 — Backward Compatibility

Check if existing complaints (without complaintId) still work:
- Can they be displayed in dashboards without errors?
- Does the code gracefully handle missing complaintId?
- Are there any console errors when rendering old complaints?

Report: PASS/FAIL — confirm old complaints don't break the UI.

---

## REQUIREMENT 7 — No UI Changes

Verify that:
- No new pages were added
- No new search bars were added
- No colors changed
- No layouts restructured
- No navigation modified
- All existing components still look the same

Report: PASS/FAIL — list any file modifications beyond Complaint.js, routes, and display logic.

---

## FINAL OUTPUT

```
REQUIREMENT 1 (Tracking ID format):       PASS/FAIL — [details]
REQUIREMENT 2 (New complaints auto-ID):   PASS/FAIL — [details]
REQUIREMENT 3 (Stored in MongoDB):        PASS/FAIL — [details]
REQUIREMENT 4 (Display in UI):            PASS/FAIL — [which files show it]
REQUIREMENT 5 (Backend API endpoint):     PASS/FAIL — [endpoint working]
REQUIREMENT 6 (Backward compatibility):   PASS/FAIL — [old complaints work]
REQUIREMENT 7 (No UI changes):            PASS/FAIL — [unchanged layout]

OVERALL: Phase 1 READY FOR PHASE 5 / NEEDS FIXES — [reason]
```

Do not modify any files. Report only.