# Reset Your Private Dashboard Password

This resets the Way2Investing account password, not the Supabase database password.
Never put a new password, recovery link, token or API key in chat.

1. In Supabase **Authentication > URL Configuration > Redirect URLs**, add
   `http://localhost:3004/institutional-intelligence/auth/callback`.
   Keep the existing Site URL unchanged.
2. Open `http://localhost:3004/institutional-intelligence/forgot-password` in
   the browser you will also use to open the recovery email (for example Chrome).
3. Enter `way2investing9@gmail.com` and select **Send reset email**.
4. Check that mailbox and its spam folder. Open the newest reset link in the
   same browser used in step 2, on this computer while the local server is running.
5. Enter a new password of at least 12 characters in both password fields.
   Submit it privately. The application requests sign-out of existing sessions
   after a successful update, then returns you to sign-in.
6. Sign in with the new account password. Owner permissions and the watchlist
   do not change when the password changes.

If the link is expired, already used, or opened in another browser, request a
new link. Browser cookie restrictions/private browsing can also prevent the PKCE
verifier from being available. Do not share the link or disable owner checks.

The local `INSTITUTIONAL_AUTH_ORIGIN` is `http://localhost:3004`. It is an explicit
server setting, never derived from submitted host headers. When deploying a
reviewed build, use the real HTTPS origin for this environment variable and add
its exact `/institutional-intelligence/auth/callback` URL to the Supabase allowlist.
Do not deploy the unrelated outstanding framework security advisories unchanged.

Recovery requests use the normal public Supabase client and configured SMTP.
No service-role password override or account-confirmation bypass is used.
Other recipients receive a generic response without a recovery request being
sent by this owner-only module. Supabase Auth rate limits still apply.

Automated tests: `npm run test:recovery`. Tests use synthetic credentials and
mock email delivery; real inbox delivery and password choice are completed by you.
