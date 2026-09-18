# Step 10 — Final Frontend Off-Production Acceptance Trigger

Date: 2026-09-18

Run the retained Portal regressions and dedicated Step 10 practice-card browser acceptance against the current candidate source only. This trigger authorises no production deployment and uses no production mutation credentials.

Final rerun 3: retained subject-local journey permits only the new GET `/api/v2/student/quiz/eligibility` call when entering Maths, targets the existing video control by stable `#video-toggle`, opens the collapsed Homework section using `[data-resource-toggle="core-homework-body"]`, then targets the protected Answer Pack control by `[data-answer="r-answer"]`. This is the final pre-promotion browser acceptance run.
