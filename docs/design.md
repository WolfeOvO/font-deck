# Font Deck Online

User-authorized online-only extension with font API, CRX/ZIP and public GitHub source; leave offline 1.2.1 untouched.

- Retain 1.2.1 semantic engine, searchable controls, text/code/math, TC→HK→SC and CJK per-face locl=0.
- No font binaries in extension. Pinned descriptors, unicode coverage, SHA-256 and source/license data stay local.
- Background fetches allowlisted font IDs from one HTTPS API, omitting cookies and referrer. Verify length+SHA-256; in-flight dedup and 256 MiB bounded persistent LRU cache. Transport 256 KiB base64 chunks; pages create binary FontFace to support strict CSP.
- Font planner chooses matching style/weight/coverage from requested runs; no page text leaves extension, no remote executable code. Dynamic runs request missing scripts. First cold download may temporarily use fallback; show loading/errors.
- Public machine-only static API path draft.wolfeovo.top/font-deck-api/v1-r1/; other draft pages remain gated. Serve unchanged OFL data with immutable hash names, CORS, HEAD and Range; no new public port/account.
- MiSans is local-installed only online because separate binary redistribution is restricted; no change to existing offline edition.
- Sign CRX3 using persistent private key outside repo/public paths; ZIP fallback. No claim of normal Windows/macOS Chrome accepting off-store CRX.
- MIT source repository WolfeOvO/font-deck, separately retained font licenses, reproducible data build, tests, API deployment instructions, release packages; no private keys/secrets.

Acceptance: test-first planner/cache/integrity; real-font strict-CSP browser injection; CDP glyphs and zh-CN/TW pixel equality; dynamic scripts, code/math/icons/emoji/pseudo/roots/frames and restoration; cold/warm/restart-offline/error cases; four UI widths; sustained mutations; API inventory/hash readback; CRX3 signature and fresh ZIP; GitHub source/release readback.
