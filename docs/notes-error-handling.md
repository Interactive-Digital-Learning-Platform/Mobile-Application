# Notes mobile failure handling — 19 October 2026

Scope: the mobile Notes feature only. Shared API clients, the Clerk provider,
other tabs/services, backend model weights and stored notes were not changed.
Earlier uncommitted study-material work is preserved.

Expected request failures are caught and shown as student-friendly messages.
Internal errors are still rejected between API and screen code so that a failed
request cannot be mistaken for a successful upload, deletion or saved response.
Raw backend/provider errors and expected-failure console.error calls have been
removed from the Notes user flow.

## Student behaviour

- Unreachable service, timeout, expired session, forbidden/not-found resources,
  busy service and upload limits have distinct safe messages.
- A failed list refresh keeps the loaded notes, displays an inline notice and
  offers retry. An initial failure is not presented as an empty notebook.
- Detail and processing failures retain the last note snapshot. Polling stops
  on failure; the student can check again or return to Notes.
- Upload failure keeps the photos/title and releases the upload button. An
  interrupted upload advises checking Notes before uploading duplicate pages.
- Camera/gallery permission or picker failures are caught inside their event
  callbacks. Cancelling a picker remains an ordinary cancellation.
- Material failures offer retry and preserve a previously loaded version.
  Model catalog/check failures also show safe text, including saved worker
  failures. Invalid success payloads are rejected before rendering.
- Private asset downloads are bounded; image decoding failures and audio play
  failures show recovery text instead of an empty photo or escaped exception.
- A Notes-only React error boundary offers retry and, on detail flows, a return
  to Notes for unexpected rendering failures. It does not replace catches in
  asynchronous handlers or promise to prevent OS/native crashes.

The JSON client defaults to a 15-second timeout, retaining the existing longer
upload and explicit model-check timeouts. Session lookup is bounded at eight
seconds; private native downloads at fifteen. Cancellation stays identifiable
and abandoned requests do not produce student error notices.

## Verification

67 focused tests pass: existing Notes processing/material/model/auth regressions
and 13 failure tests covering real client interceptors, malformed responses,
actual upload callbacks, hung session/download work and image decoding recovery.
Tests use controlled adapters/device stubs; they send no student data externally,
write no note records and do not require stopping the backend.

TypeScript `--noEmit` and the full production web export pass. The export is
retained in `.expo/notes-resilience-export-20261019/` (Git-ignored). Scoped ESLint
passes with zero errors and eight existing warnings. Physical Android/iOS failure scenarios were not exercised;
reload the updated JS bundle (or create a new release build) to use these changes.

Run the failure checks with:

```sh
node --test scripts/test-notes-failures.cjs scripts/test-notes-upload-failures.cjs scripts/test-notes-asset-failures.cjs scripts/test-notes-auth.cjs
```
