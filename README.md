# NVR Content

A focused local workbench that turns approved business details into editable
social posts, a promotional email, and a short video script.

## Run locally

Requirements: Node.js 22.13 or newer and npm.

macOS, Linux, or Windows PowerShell:

```powershell
npm install
npm run dev
```

Open <http://127.0.0.1:3001>. For a production-mode local run:

```powershell
npm run build
npm start
```

If port 3001 is already occupied, do not stop the other process. Start on a
different port:

```powershell
npx next dev --hostname 127.0.0.1 --port 3002
```

## Sample Demo and live generation

The three fictional Sample Demo presets are bundled with matching prepared
inputs and outputs. They load entirely in the browser and never call AI.

The app starts without credentials. Custom generation then shows a clear
configuration message and never substitutes a sample result.

To enable live custom generation, copy `.env.example` to `.env.local` and add:

```dotenv
OPENAI_API_KEY=your_server_only_key
NVR_CONTENT_MODEL=gpt-4o-mini
```

`NVR_CONTENT_MODEL` is optional. The server uses the OpenAI adapter through the
Vercel AI SDK. `OPENAI_API_KEY` is read only by the server; never rename it with
a `NEXT_PUBLIC_` prefix.

One request produces the complete structured content pack. Generation uses no
tools, browsing, files, or external memory. SDK retries are disabled and the
request has a 30-second timeout.

## Privacy and content boundaries

- Sample Demos do not leave the browser.
- Live generation sends the exact submitted business details and campaign
  fields to the configured OpenAI model.
- The app has no accounts, database, analytics, history, or persistence.
- Inputs and outputs live only in current page state.
- Credentials and business text are not written to application logs.
- Generated drafts are not fact-checked or automatically approved. Review every
  draft before sharing.

The prompt and response schema prohibit unsupported prices, discounts,
deadlines, scarcity, credentials, testimonials, guarantees, contact details,
and services. Model output remains untrusted and requires human review.

## Verification

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm audit
```

The focused tests cover API validation and failure mapping, missing provider
configuration, concurrent duplicates, stale/late client responses, local
samples, reset and sample switching, safe text rendering, and current-edit
copy/download behavior. `evals/content-boundaries.ts` is a small deterministic
evaluation fixture set for content boundary scenarios. It does not prove live
model quality.

## Prototype limitations

- Rate and in-flight duplicate guards are local and in-memory. They are not
  distributed protection for production or multiple server instances.
- There is no authentication, saved history, scheduling, automatic posting,
  media generation, or deployment configuration.
- Live content quality depends on the configured model and has to be evaluated
  with real provider calls before claiming live verification.
- This is a local prototype, not production-certified software.

Third-party license information is in `THIRD_PARTY_NOTICES.md`.
