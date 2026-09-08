# Repository instructions for coding agents

## Production identity

This repository, `FuturePerfectTuitions/futureperfect-lessons-test`, is the **live Portal V2 frontend** served at:

`https://lessons.futureperfect.education`

The repository name is historical. Do not treat it as a disposable test repository.

## Mandatory targeting rule

When the user asks for a change to the live Portal V2 student-facing website — including HTML, CSS, JavaScript, buttons, layout, styling, navigation or frontend behaviour — make that change in **this repository** unless the user explicitly identifies a different target.

Do **not** make live frontend changes in `FuturePerfectTuitions/futureperfect-lessons-v2` merely because its name contains `v2`.

Before editing, verify the root `CNAME` points to `lessons.futureperfect.education` and inspect `index.html` to identify the actual loaded assets.

## Safety

Do not delete files solely because similarly named copies exist in another repository. Delete only after confirming they are unreferenced and not required by deployment, testing, rollback or backend workflows.
