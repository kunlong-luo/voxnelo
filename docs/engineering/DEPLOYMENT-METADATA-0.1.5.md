# Voxnelo 0.1.5 — deployment metadata and release copy

**Status:** Early Access / testing candidate. This is a metadata source of truth, **not authorization to publish a Stable release**. Keep #45, #38 and #55 acceptance separate.

## GitHub repository About (maintainer-controlled UI)

- **Description:** `Voxnelo — a local-first desktop app for practicing spoken English, one sentence at a time. (Early Access)`
- **Website:** `https://kunlong-luo.github.io/voxnelo/` (confirm Pages is actually deployed before enabling as a public landing page)
- **Topics:** `english-learning`, `speaking-practice`, `electron`, `react`, `typescript`, `offline-first`, `education`
- **License:** MIT for this repository's own source code; third-party ASR model and native runtime redistribution are separate reviews.
- **Maintainer / author:** Leo Luo
- **Issues:** `https://github.com/kunlong-luo/voxnelo/issues`
- **Source:** `https://github.com/kunlong-luo/voxnelo`
- **Privacy:** `https://github.com/kunlong-luo/voxnelo/blob/main/docs/PRIVACY.md` (pending release review)

The repository's About fields/topics may require editing in GitHub **Settings / About** with appropriate permissions. Source package metadata does not change the GitHub About panel automatically.

## Installer and software-center metadata

| Field | Current value / limitation |
| --- | --- |
| Product / package | Voxnelo / `voxnelo` |
| Version | `0.1.5` (do not increment or tag until release decision) |
| Publisher | Leo Luo |
| Identifier | `app.voxnelo.desktop` |
| Category | Education |
| License | MIT application source, **not** blanket approval for separately acquired ASR binaries |
| Description | Local-first English speaking practice with short sentences, system reference voice, temporary recording playback, favorites and on-device progress |
| Website | `https://kunlong-luo.github.io/voxnelo/` |
| Support / bug reporting | `https://github.com/kunlong-luo/voxnelo/issues` |
| Linux x64 | Unsigned candidate DEB / AppImage; branded `Voxnelo.deb` alias shares contents with versioned package |
| Windows | Unsigned candidate NSIS installer |
| macOS | Unsigned / unnotarized candidate DMG, microphone purpose string present |
| Voice recognition | **Not bundled in standard installers**. Personal opt-in Linux offline ASR pilot is experimental and unaccepted |
| Audio / privacy | Permission required; temporary session recording, not uploaded by Voxnelo. A browser-supplied recognition option may have distinct privacy/network behavior |

The Linux AppStream record is `build/app.voxnelo.desktop.metainfo.xml`. GitHub release workflow creates *unsigned candidate artifacts*, not a published release. The KDE Discover local-file preview may show an unknown author even when packaged AppStream metadata names Leo Luo: do not promise system-controlled UI text can be overridden.

## Draft GitHub prerelease title and description (only after checks)

**Title:** `Voxnelo v0.1.5 — Early Access (Testing)`

**Summary:** `Early Access test build of Voxnelo, a local-first English speaking practice desktop app. Includes 40 bilingual English phrases, reference playback using your system voice, record-and-replay, favorites, review and local learning history. No account is required.`

**Known limitations:** `Experimental offline live dictation requires separately installed personal resources and is not included in standard installers. Recognition accuracy and noise performance are still under review. Windows/macOS candidates are unsigned; the macOS build is not notarized. Automated packaging checks do not replace physical microphone or accessibility testing.`

**Assets:** Attach only checksummed and individually verified target-platform builds. Use the versioned Linux DEB and optional friendly `Voxnelo.deb` alias with identical bytes; add AppImage, Windows NSIS and macOS DMG only when the relevant acceptance/signing decision is explicit. Link release checksums; do not invent a download or claim stable support.

**Release checkbox:** Mark `Set as a pre-release`; do **not** select `Set as the latest release` as Stable merely because CI passed. Do not create a `v0.1.5` tag or publish at all until the release owner approves the targeted Early Access scope and actual artifact.

## Final manual confirmations

Confirm GitHub Pages availability, valid public download targets, screenshots, target OS compatibility, privacy disclosures, licensing and signing status. Review #38, #45, #55 and `docs/engineering/V0.1-ACCEPTANCE-MATRIX.md`; never replace outstanding human-device results with CI evidence.
