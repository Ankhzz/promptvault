<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Security Hardening — Known Limitations

- **Rate limiting** is in-memory (middleware `Map`). It resets on server restart and does not persist across instances. For production with multiple instances, use a shared store (Redis, Upstash).
  - Current: 30 requests / 60 seconds per IP
  - Only active in non-development mode
  - Does not distinguish authenticated vs unauthenticated requests
- **CometBFT RPC** must be HTTPS in production. The default dev endpoint (`http://172.192.41.96:26657`) is a private IP and will not work in deployed environments. Set `NEXT_PUBLIC_COMET_RPC_URL` to an HTTPS proxy.
- **CSP `unsafe-inline`** for styles is required by Next.js and font loading. `unsafe-eval` is dev-only.
- **Auth boundary** checks cookie presence only (not JWT validity). JWT validation happens server-side in Server Actions.
- **Test routes removed** — `/test`, `/test-cdr`, `/test-cdr-flow` directories deleted; middleware test-route block removed.
- **Crypto logging** — `src/lib/logger.ts` provides `cryptoLog()` which redacts keys/addresses. Production builds suppress all `cryptoLog` output.
