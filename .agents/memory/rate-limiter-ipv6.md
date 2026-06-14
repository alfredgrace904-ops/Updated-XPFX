---
name: Rate limiter IPv6 fix
description: How to suppress express-rate-limit IPv6 keyGenerator warning
---

`express-rate-limit` v8 throws `ERR_ERL_KEY_GEN_IPV6` when a custom `keyGenerator` uses `req.ip` as a fallback. This is a non-fatal `ValidationError` (server still starts) but is noisy and should be suppressed.

**Fix:** Add `validate: { keyGeneratorIpFallback: false }` to the rate limiter options.

**Wrong keys (do not use):** `validate: { keyGenerator: false }` — this throws `ERR_ERL_UNKNOWN_VALIDATION`.

**Supported validate keys (v8.5.x):** `ip`, `trustProxy`, `xForwardedForHeader`, `forwardedHeader`, `positiveHits`, `unsharedStore`, `singleCount`, `limit`, `draftPolliHeaders`, `onLimitReached`, `headersDraftVersion`, `headersResetTime`, `knownOptions`, `validationsConfig`, `creationStack`, `ipv6Subnet`, `ipv6SubnetOrKeyGenerator`, `keyGeneratorIpFallback`, `windowMs`, `default`.
