# Threat Model

## Project Overview

NeXTrade is a pnpm monorepo for a crypto trading and P2P platform. The production security boundary is centered on `artifacts/api-server`, an Express 5 API mounted under `/api` with a signed-cookie session (`xpfx_sid`) backed by an in-memory session map in `artifacts/api-server/src/lib/session.ts` and `src/lib/store.ts`. Two production-relevant web clients consume that API: `artifacts/nextrade` for customer-facing flows and `artifacts/admin-portal` for operator/admin workflows. Both clients are untrusted; all authentication, authorization, and business-rule enforcement must happen server-side.

Assumptions carried into this threat model:
- Production runs with `NODE_ENV=production`.
- Replit terminates TLS for deployed traffic.
- `artifacts/mockup-sandbox` is a development-only preview environment and is out of scope unless a future deployment path makes it reachable in production.

## Assets

- **User accounts and sessions** — login credentials, session cookies, server-side session state, referral identities, and any seeded or demo identities. Compromise enables impersonation and access to private account features.
- **Financial state and payout controls** — wallet balances, transactions, withdrawals, deposits, billing cycles, gas-fee settings, P2P orders, and asset purchases. Tampering here can cause direct monetary loss or incorrect ledger state.
- **Identity and personal data** — KYC submissions, bank-account metadata, support tickets, live-chat transcripts, mailbox threads, and profile data. This data is sensitive and often regulated.
- **Payment and wallet secrets** — card PAN/CVV/expiry, crypto deposit addresses, connected-wallet addresses, and any notes or vault content that operators may treat as credentials. These secrets have immediate abuse value if disclosed.
- **Administrative capabilities** — admin-only actions such as viewing all users, reviewing KYC, approving withdrawals, adjusting balances, changing billing defaults, and accessing cross-user account detail. Abuse of these capabilities can impact the entire platform.

## Trust Boundaries

- **Browser / API boundary** — all requests from `artifacts/nextrade` and `artifacts/admin-portal` cross into the Express API. Client input is untrusted and must not be relied on for authorization or financial controls.
- **Public / authenticated boundary** — login, signup, session bootstrap, and health endpoints are reachable before authentication; trading, wallet, KYC, support, and billing features require a server-validated session.
- **Authenticated / admin boundary** — `/admin/*` APIs and admin-portal workflows expose platform-wide control and cross-user data. These routes must be restricted by server-side role checks.
- **API / shared in-memory state boundary** — route handlers mutate shared global maps and per-user records in memory. Logic bugs at the route layer can corrupt or disclose state across users.
- **Production / dev-only boundary** — `artifacts/mockup-sandbox/**` and other preview-only code are out of scope for production unless reachability is demonstrated.

## Scan Anchors

- **Production entry points:** `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/index.ts`, `artifacts/api-server/src/routes/**/*.ts`
- **Highest-risk code areas:** `artifacts/api-server/src/routes/auth.ts`, `artifacts/api-server/src/lib/session.ts`, `artifacts/api-server/src/lib/store.ts`, `artifacts/api-server/src/routes/admin.ts`, `artifacts/api-server/src/routes/admin-extended.ts`, `artifacts/api-server/src/routes/admin-users.ts`, `artifacts/api-server/src/routes/withdrawals.ts`, `artifacts/api-server/src/routes/p2p.ts`, `artifacts/api-server/src/routes/moonpay.ts`, `artifacts/api-server/src/routes/wallets.ts`, `artifacts/api-server/src/routes/live-chat.ts`, `artifacts/api-server/src/routes/cards.ts`, `artifacts/api-server/src/routes/billing.ts`, `artifacts/api-server/src/routes/gas-fee.ts`
- **Public vs authenticated vs admin:** public `/auth/*` and `/healthz`; authenticated user routes under `/users`, `/wallets`, `/trades`, `/messages`, `/p2p`, `/assets`, `/support`, `/billing`, `/withdrawals`, `/deposits`, `/banks`, `/cards`, `/kyc`, `/live-chat`, `/mailbox`; admin routes under `/admin/*`
- **Usually dev-only:** `artifacts/mockup-sandbox/**`

## Threat Categories

### Spoofing

The platform authenticates users with a signed cookie plus server-side session map. Production must never rely on public demo bootstrap flows, shared fixture credentials, or other broadly reusable identities as substitutes for real authentication. Every protected route must derive identity only from validated server-side session state, and production session secrets must be strong and environment-specific.

### Tampering

Users can trigger money-moving and state-changing actions such as withdrawals, billing payments, P2P orders, asset purchases, KYC submissions, support messages, and admin reviews. The API must enforce all financial and workflow invariants server-side, including destination validation, denomination rules, and role-restricted mutations. Client-side checks are advisory only and cannot be treated as security controls.

### Information Disclosure

The API handles KYC details, bank-account metadata, support communications, mailbox threads, wallet information, payment-card data, connected-wallet signing material, and administrative notes. Responses must be scoped to the authenticated principal or an explicitly authorized admin workflow, and the platform must minimize retention and exposure of highly sensitive secrets such as full PAN/CVV, seed phrases, private keys, or credential-like notes. Debug/demo data must not expose real-looking account content to unauthenticated visitors.

### Denial of Service

Public and low-friction entry points such as login, signup, demo bootstrap, support messaging, live chat, and other authenticated mutations can be abused to create unlimited sessions or operator-facing spam. Sensitive public and member-only endpoints should be rate-limited or otherwise constrained so attackers cannot cheaply fill queues or create unbounded in-memory state.

### Elevation of Privilege

The largest project-specific risk remains abuse of the admin boundary and authenticated-user perimeter. No regular or anonymous user should be able to reach admin-only APIs, and no public bootstrap path should silently grant access to member-only workflows that create shared business state. Administrative APIs should expose only the minimum secret material necessary for the task being performed.