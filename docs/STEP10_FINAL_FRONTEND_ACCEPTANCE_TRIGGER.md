# Step 10 — Final Frontend Off-Production Acceptance Trigger

Date: 2026-09-18

Run the retained Portal regressions and dedicated Step 10 practice-card browser acceptance against the current candidate source only. This trigger authorises no production deployment and uses no production mutation credentials.

Retry: retained subject-local journey now explicitly permits only the new GET `/api/v2/student/quiz/eligibility` call when entering Maths while continuing to forbid legacy `/subjects/` fetches.
