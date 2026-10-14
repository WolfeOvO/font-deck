# Release 1.3.0 Online

- Lightweight online-only MV3 extension; signed CRX3 and ZIP, no font binary payload.
- Google Sans → Noto CJK TC → HK → SC, verified regional outlines and centered fullwidth punctuation even on zh-CN pages.
- Fixed allowlisted font-data API; full length/SHA-256 verification; bounded cache and parallel fetches; warm reload and restart-offline cache.
- Separate prose/code/math controls, searchable selectors, actual preview, failure fallback and retry, cache usage/clear.
- Retains 1.2.1 semantic and performance fixes, protects icons/emoji and restores website styles.
- Public source MIT; original font licenses preserved; no private signing key in repository or release. Existing offline 1.2.1 is unchanged.

Installation: extract ZIP and load its manifest directory at chrome://extensions in developer mode. CRX3 is also provided; ordinary Windows/macOS Chrome restricts self-hosted CRX installation, so use ZIP unless the browser's supported store/enterprise install path applies. Not published to Chrome Web Store.

Initial TC file download is about 36 MB and can temporarily use fallback. Cached fonts work without a network connection; uncached fonts require the API. MiSans/PuHuiTi remain local-installed choices in this edition. Linux Chromium verified; no claim of all websites or user Windows/macOS testing.
