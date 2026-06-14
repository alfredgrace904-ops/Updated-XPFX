---
name: JWT auth pattern
description: How JWT tokens are layered on top of the existing cookie session system
---

JWT tokens are purely additive — they allow API/mobile clients to authenticate without cookies. Browser clients continue using the signed `xpfx_sid` cookie.

**Rule:** Cookie session is always checked first in `attachSession`. If cookie auth succeeds, Bearer token is never examined. JWT only activates when no valid session cookie is present.

**Why:** Replacing cookie auth would break all existing browser flows. Adding Bearer token support is a zero-risk extension.

**How to apply:**
- `src/lib/jwt.ts` — `signAccessToken`, `signRefreshToken`, `issueTokenPair`, `verifyToken`
- `src/lib/session.ts` — `attachSession` tries cookie first, then falls back to Bearer
- `src/routes/jwt-auth.ts` — `POST /auth/refresh` and `POST /auth/token`
- Login/OTP verify responses now include `{ accessToken, refreshToken, expiresIn }` alongside session data
- `JWT_SECRET` env var — MUST be set in production; falls back to dev placeholder in development
