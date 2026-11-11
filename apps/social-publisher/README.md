# Way2Investing Social Studio

Standalone application intended for **https://sm.way2investing.com**. It is isolated from the existing investment dashboard and has its own layout, dependencies, and deployment root.

## Current implementation

This is a functional **local editorial prototype**, not an automatic publisher yet. It supports a clearly labeled fictional content feed, duplicate-aware draft creation, manual composition, editing, channel selection and approximate previews, approval, planned timestamps, automation-rule preferences, and JSON export. Drafts and settings persist in localStorage in the same browser and origin. Editing resets approval. Planned timestamps do not execute jobs. No API tokens are collected, no live market data is displayed, and no social posts are sent.

Supported destinations in the workspace: Facebook, Instagram, YouTube, X/Twitter, and Threads. The setup and channel pages explain outstanding integrations. An Instagram asset workflow and a YouTube video-rendering pipeline still need implementation.

## Run

From this directory:

```powershell
npm install
npm run dev
```

Open http://localhost:3001. Install dependencies in this app's directory before running it; its build is isolated from the parent dashboard. Production checks:

```powershell
npm run typecheck
npm run build
```

## Production architecture to implement

1. Shared-password authentication is implemented (see below). Add individual staff accounts and workspace roles; enforce authorization in every future server endpoint and worker operation.
2. Separate durable database tables for workspaces, memberships, source events, drafts, revisions, account connections, rules, delivery jobs, and audit events. Encrypt OAuth credentials server-side; do not put secrets in localStorage or NEXT_PUBLIC variables.
3. OAuth integrations for Meta (Facebook/Instagram/Threads), Google (YouTube), and X. Validate OAuth state, use PKCE where supported, restrict callback redirects, refresh credentials, and handle revocation. Account setup and any applicable platform reviews must be completed by the account owner.
4. Server-side market ingestion using licensed earnings/news feeds, potentially sharing the existing dashboard's Finnhub services via a protected integration. Preserve source URL, provider event ID, reporting period, event timestamp, and original structured figures. Verify redistribution rights before ingestion is enabled.
5. Deterministic earnings templates before optional AI rewriting. Keep facts separate from generated copy. Earnings schedules alone are not reported earnings. Retain verified actuals and estimates; reject stale or incomplete records.
6. Branded earnings cards for visual channels; a separate script, voiceover, captions, and video-rendering/upload workflow for YouTube. Text-only events cannot publish directly to every destination.
7. A durable background queue driven by a scheduler independent of an open browser. Unique event/account/revision delivery keys prevent duplicate enqueueing. Atomically claim jobs with leases, record each channel's remote post ID, apply retry/backoff and rate limits, and reconcile ambiguous timeouts before retrying a possible successful delivery. Record partial successes per destination.
8. Approval/manual mode initially, then user-configurable auto-post rules with per-channel limits, source allowlists, quiet hours, and a pause switch. Never auto-publish the fictional preview feed.
9. Automated validation of event deduplication, permissions, approval invalidation, token expiry, partial delivery failures, uncertain timeout reconciliation, and media processing failures before enabling unattended publication.

## Hosting at sm.way2investing.com

The existing financial dashboard targets Vercel; this standalone Next.js project can be deployed as a second project from the same repository. Set its **Root Directory** to `apps/social-publisher`, framework to Next.js, install command to `npm ci --include=dev`, and build command to `npm run build`. Leave the output directory at the Next.js default. The app has its own lockfile and plain-CSS PostCSS configuration. Turbopack and file tracing use the app directory, so the build does not require the dashboard's Tailwind dependencies or configuration.

Add `sm.way2investing.com` as the new project's production domain. Use the **exact DNS records returned by the chosen host**; do not assume a generic CNAME target or change the existing apex/other subdomains. Verify domain ownership, DNS propagation, and HTTPS before configuring production OAuth callback URLs. Hosting/DNS have not been changed by this implementation.

The app requires the server-only password and session signing secret described below. Live publishing will additionally need provider credentials, a database, encryption key, a queue/scheduler, a licensed market feed, and operation-specific authorization.

## Password protection

The entire workspace is gated on the server. Anonymous page requests redirect to `/login`; anonymous `/api/*` requests return 401. The home page also independently verifies the session before rendering. Only the login page and framework assets are public. Future sensitive route handlers and server actions must also call `requireSession()` from `src/lib/auth.ts` before doing work.

An ignored `.env.local` is configured in this checkout with the requested temporary password `1234` and a generated signing secret. For a clean checkout, copy `.env.example` to `.env.local` and set both values:

- `SOCIAL_STUDIO_PASSWORD`: the shared access password. Change this setting and restart/redeploy to change the password.
- `SOCIAL_STUDIO_SESSION_SECRET`: a unique random secret of at least 32 characters. Generate one with `node -e "process.stdout.write(require('node:crypto').randomBytes(48).toString('hex'))"`. Keep it server-side and never commit it.

Set both variables in the hosting provider before deployment. Missing configuration fails closed; there is no production fallback password. Sessions are HMAC-signed, expire after 12 hours, and use an HttpOnly, SameSite=Strict, host-only cookie (Secure in production). Changing the password or signing secret invalidates existing sessions. Sign out clears the browser session cookie. Private responses use `Cache-Control: private, no-store`.

Sign-in accepts at most five attempts per 15-minute window on a running server instance, including parallel attempts. This is a best-effort local throttle; restarts reset it and multiple instances do not share it. Add a shared gateway/store limit for a public multi-instance deployment. The shared limit can temporarily block legitimate sign-in attempts too. `1234` is temporary and should be replaced before public launch. Browser-only drafts remain stored on the device after signing out; this gate does not encrypt or erase localStorage.

Run `npm test` (Node 22.18+ or Node 24+) to check password verification, session tampering/expiration, fail-closed configuration, and session invalidation after credential rotation.

## Official integration references

- Facebook Pages: https://developers.facebook.com/docs/pages-api/posts/
- Instagram publishing: https://developers.facebook.com/docs/instagram-platform/content-publishing/
- Threads publishing: https://developers.facebook.com/docs/threads/posts/
- YouTube uploads: https://developers.google.com/youtube/v3/docs/videos/insert
- X publishing: https://docs.x.com/x-api/posts/create-post

Platform access, account eligibility, media requirements, and permission availability must be verified when implementing each adapter; these can change.
