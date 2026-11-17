# Voxnelo — Development guide

[English README](../README.md) · [简体中文 README](../README.zh-CN.md)

These instructions apply to **Voxnelo 1.0.4 source (unpublished candidate)**. The latest public release remains **v1.0.3**, an unsigned desktop distribution. A successful build is not evidence of a published, signed, notarized or physical-device-certified release.

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
pnpm docs:check       # Current docs: offline local links and pnpm script names
pnpm docs:check:all   # Historical Markdown too (investigative; may expose archival debt)
pnpm test             # Vitest
pnpm build            # Renderer + Electron main process
pnpm pack:linux       # Linux DEB + AppImage (run on Linux)
pnpm pack:windows     # Windows installer (run on supported build environment)
pnpm pack:mac         # macOS DMG (run on macOS)
pnpm diagnose:linux   # Local Linux installer diagnostics (no installation)
```

**Build-host constraints:** `pnpm pack:mac` requires macOS to produce a `.dmg` (Apple's `sips` / `hdiutil` are not available on Linux). Voxnelo now checks this **before** compiling or downloading Electron. A Windows `pnpm pack:windows` NSIS installer can be cross-built on Linux, but the resulting `.exe` and a `signing with signtool.exe` build log do **not** prove Authenticode signing or Windows usability. Run the Windows candidate on real Windows before distribution. Both commands use `--publish never`; they do not upload assets to GitHub Releases.

Package outputs are saved under `release/`. On Linux, packaging produces a versioned `voxnelo_<version>_amd64.deb`, the `Voxnelo.deb` local-file alias and an AppImage. The build version follows `package.json`. Local builds are **testing candidates**, not automatically signed, approved or published installers.

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
- The public **v1.0.3** supports opt-in local Moonshine dictation on Linux x64. The unpublished **v1.0.4 source candidate** additionally implements opt-in native Moonshine paths for Windows x64 and macOS 15+ Apple Silicon; third-party SDK/models are not bundled in installers. See the [cross-platform pilot](engineering/MOONSHINE-CROSS-PLATFORM-PILOT.md) and the [Linux installation guide](engineering/MOONSHINE-LINUX-INSTALLATION.md). Do not infer hardware accuracy, authorization or publishing status from source or CI.
- Some Linux NVIDIA/X11 machines log GPU/GBM warnings; the existing development Electron command includes a GPU sandbox workaround. Do not change the packaged app's sandbox behavior without a separate security review.

## Release checklist

For current releases, use [release operations](engineering/RELEASE-OPERATIONS.md) and [release readiness](engineering/STABLE-RELEASE-READINESS.md). The [V0.1 acceptance matrix](engineering/V0.1-ACCEPTANCE-MATRIX.md) and [historical candidate guide](engineering/V0.1-RC-PLAYBOOK.md) remain archival evidence, not current publish instructions. Real microphone and permission tests, content/voice license review, and supported-platform installer checks remain mandatory before public release. An unpublished GitHub Draft does not approve publication.
