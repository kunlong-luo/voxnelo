# Voxnelo — Development guide

[English README](../README.md) · [简体中文 README](../README.zh-CN.md)

These instructions are for contributors building **Voxnelo 0.1.5 from source**. The application is still in Early Access; successful builds do not imply signed or real-device-validated public releases.

## Requirements

- Node.js 22 (supported LTS)
- Corepack and the pnpm version pinned by the root `package.json`
- For desktop audio testing: a graphical desktop, an output device, and an optional microphone

## Get started

From your own checkout of the repository:

```bash
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

If Corepack has already activated the pinned version of pnpm, using `pnpm` directly is equivalent. Do not remove existing project files or personal learning data to update the app.

## Common tasks

```bash
pnpm dev              # Web dev server + Electron
pnpm dev:web          # Web preview only
pnpm typecheck        # TypeScript
pnpm lint             # ESLint
pnpm test             # Vitest
pnpm build            # Renderer + Electron main process
pnpm pack:linux       # Linux DEB + AppImage (run on Linux)
pnpm pack:windows     # Windows installer (run on supported build environment)
pnpm pack:mac         # macOS DMG (run on macOS)
pnpm diagnose:linux   # Local Linux installer diagnostics (no installation)
```

Package outputs are saved under `release/`. On Linux, packaging produces both the canonical `voxnelo_0.1.5_amd64.deb` and a byte-identical `Voxnelo.deb` for KDE Discover local-file previews, plus an AppImage. These are **testing candidates**, not signed or approved public installers.

## Linux desktop icon (development only)

The app window icon and desktop launcher are separate integration points. `build/icon.png` is the source brand asset. After updating the code, fully exit the old Electron process and restart `pnpm dev`; refreshing the web renderer alone will not update the native window icon.

If the development window shows the generic Electron icon on some Linux desktops, register the current-user launcher:

```bash
pnpm icon:linux:dev
```

This creates only the user-level development launcher and does not modify the installed production app. If no longer needed:

```bash
pnpm icon:linux:dev:remove
```

The packaged DEB installs its own desktop integration and icon. KDE Discover's **local file preview** may still display `Unknown author` because the PackageKit view does not use AppStream author metadata. This is different from the developer name carried in the DEB's AppStream files.

## Speech and data boundaries

- Demonstration audio is supplied by local system TTS where available. Some Linux systems use an eSpeak fallback; live audio output still requires physical-device testing.
- Microphone playback recordings are session-only; browsing/practice events, favorites, and review flags persist locally in IndexedDB.
- Desktop real-time dictation requires an **opt-in personal Linux ASR pilot**; default public packages do not bundle third-party native recognizers or models. See [the pilot setup guide](engineering/LOCAL-ASR-PERSONAL-PILOT.md). Do not claim quality or redistribution approval from build checks.
- Some Linux NVIDIA/X11 machines log GPU/GBM warnings; the existing development Electron command includes a GPU sandbox workaround. Do not change the packaged app's sandbox behavior without a separate security review.

## Release checklist

Use the [V0.1 acceptance matrix](engineering/V0.1-ACCEPTANCE-MATRIX.md) and [release candidate guide](engineering/V0.1-RC-PLAYBOOK.md). Real microphone and permission tests, content/voice license review, and supported-platform installer checks remain mandatory before public release. The [GitHub draft workflow](engineering/GITHUB-RELEASE-DRAFT.md) creates an unpublished draft; it does not approve publication.
