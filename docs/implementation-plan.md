# Font Deck Online Implementation Plan

**Goal:** online-only lightweight MV3 extension, font-data API, signed CRX3/ZIP and GitHub source without modifying offline release.
**Architecture:** pinned face index → run planner → background integrity/cache → chunk transport → binary FontFace. Reuse semantic engine with optional requestFonts callback.
**Spec:** docs/design.md

- [ ] Generate isolated online catalog/registry/source manifest; offline hashes recorded; MiSans local-only.
- [ ] Write failing planner/cache/integrity and real strict-CSP loader tests.
- [ ] Implement font planner, bounded cache/chunk API, binary FontFace loader and resource callback.
- [ ] Online UI copy/loading/error/cache controls and actual preview; four widths; dynamic/protection/offline tests.
- [ ] Deploy allowlisted OFL data API; verify public hashes/CORS/Range and unrelated gate.
- [ ] Public-API acceptance; CRX3/ZIP signing/integrity/fresh-load tests.
- [ ] Review and publish MIT GitHub source/release; verify remote tree/assets and no secrets; update skill.
