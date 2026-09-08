# Future Perfect Tuitions — LIVE Portal V2 Frontend

> **IMPORTANT: THIS IS THE LIVE STUDENT PORTAL FRONTEND REPOSITORY.**
>
> Production URL: `https://lessons.futureperfect.education`
>
> All student-facing Portal V2 HTML, CSS, JavaScript, layout, styling, navigation and frontend behaviour changes for the live portal must be made in this repository unless Sej explicitly says otherwise.

## Canonical repository rule

- **LIVE FRONTEND:** `FuturePerfectTuitions/futureperfect-lessons-test`
- **NOT the live frontend:** `FuturePerfectTuitions/futureperfect-lessons-v2`
- The custom domain is bound here through the root `CNAME` file.

Do not redirect a requested live Portal V2 UI change to `futureperfect-lessons-v2` merely because that repository name contains `v2`.

## Before making any live Portal V2 frontend change

1. Confirm the target is `FuturePerfectTuitions/futureperfect-lessons-test`.
2. Confirm `CNAME` contains `lessons.futureperfect.education`.
3. Inspect the currently loaded files from `index.html` before editing CSS or JavaScript.
4. Make the smallest required change in this repository.
5. If cache-sensitive CSS or JavaScript changes are made, update the relevant cache-busting query string in `index.html` when appropriate.

## Other repository

`FuturePerfectTuitions/futureperfect-lessons-v2` still contains development/history and Worker/backend material. Do not assume its frontend copies are production simply because they look newer or have matching filenames.
