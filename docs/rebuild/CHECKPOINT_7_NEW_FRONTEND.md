# Portal V2 Performance Rebuild — Checkpoint 7 New Frontend

Checkpoint 7 is implemented only on `rebuild/checkpoint7-new-frontend-2026-09-13` in the live-frontend repository. Production `main` remains anchored at `96bfdc4dc3e72b0f354a205bc5a79f6d51c290f7` until a later approved cutover checkpoint.

## Architecture

The replacement is a clean Vite application with:
- one core student application entry;
- one compiled production stylesheet;
- a specialist protected-viewer module loaded only after a successful Answer Pack password authorization;
- self-hosted `pdfjs-dist` code emitted into the build instead of global startup PDF.js;
- no legacy Phase/Change runtime assets in the new `index.html`.

The app speaks the official Checkpoint 6 `/api/v2` contract. Its API base is configurable through `window.FPT_V2_CONFIG.workerBaseUrl`; an empty value uses same-origin paths, which is the intended first-party-cookie shape for the later private/cutover routing checkpoints.

## Bounded networking

GETs are de-duplicated while in flight. Navigation owns AbortControllers and an epoch so stale responses cannot overwrite a newer screen. Every JSON operation has a deadline and visible retry state. Subject selection is local from the Home payload and performs no subject API call.

## Resource behaviour

- Lesson render does not set a ScreenPal/video iframe source.
- First `View` assigns the capability-open URL to the iframe; `Hide` preserves the loaded iframe.
- Leaving the lesson removes the iframe source.
- Ordinary resources are direct browser links to the capability-open route; there is no Blob/objectURL reconstruction.
- Answer Packs require a password every open, then dynamically import the protected viewer. The viewer fetches only the short-lived protected-view URL, renders to canvas with self-hosted PDF.js, adds a student watermark, exposes no normal download/print button and contains no recurring heartbeat.
- Locked previews render metadata only and no resource/video controls.

## Browser gate

The automated Checkpoint 7 gate builds the production bundle and exercises mocked Checkpoint 6 responses in:
- desktop Chromium;
- Pixel-class mobile Chromium;
- iPad/WebKit.

It verifies login/bootstrap, local subject selection, Current/Previous view rendering, Year/Level catalogue load, locked/open control-column alignment, lesson opening, video laziness, direct ordinary resources, password-protected Answer Pack lazy-viewer activation, locked preview isolation, rapid-navigation cancellation, bounded timeout/retry and no mobile horizontal overflow. Screenshots are retained as workflow evidence.

## Scope boundary

Checkpoint 7 does not switch the live GitHub Pages source, route production student traffic, bind production data, or start the all-student access backfill/parity audit. Data/persona parity cases such as every Full Library, VR How-To, guest/manual grant and production-shaped student configuration belong to Checkpoint 8 and later UAT gates; the frontend is designed to render the compiled views/resources supplied by the new runtime without inferring entitlement rules itself.
