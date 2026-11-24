# Node.js 26 LTS migration — 2026-11-21

## Purpose and verified baseline

Voxnelo uses Node.js as its build and test runtime; Electron embeds its own independent Node.js runtime. Upgrading CI Node does not upgrade the Node version inside installed Electron applications.

- PR [#228](https://github.com/kunlong-luo/voxnelo/pull/228) validated the full required `check` job plus Windows, macOS and Linux desktop-package integrity on Node.js 26 LTS. CI included Linux DEB installation, not a device microphone test.
- Vitest/jsdom tests initially failed because Node.js 26 reserves global Web Storage names. `tests/setup-jsdom-storage.ts` now restores jsdom's *real* `localStorage` and `sessionStorage` objects, guarded by `tests/jsdom-storage-compat.test.ts`. No application storage code or ASR code was changed.
- Maintained Actions workflows are aligned to Node.js 26. Version-pinned, disabled historical publish workflows are deliberately **not** edited or re-run.

## Toolchain policy

1. Use supported **stable/LTS** Node.js, not Current, nightly, alpha, beta or RC.
2. Pin a concrete pnpm version in `packageManager`; verify its package SHA-512 integrity in `pnpm-lock.yaml` (`packageManagerDependencies` and pnpm artifact resolution). The `packageManager` string itself need not carry a checksum. Never edit integrity values by hand.
3. pnpm is the sole supported JavaScript package manager; the public npm registry remains the upstream archive source, not a command-line tool. Bootstrap pnpm using the official standalone installer as described in [Development](../DEVELOPMENT.md). Do not invoke other JavaScript package-manager CLIs or create alternative lockfiles.
4. Use `pnpm install --frozen-lockfile` on CI, keep TypeScript/lint/unit tests/build/security audits and cross-platform package gates intact.
5. Keep Electron's embedded Node version separate from the build-runtime version and validate native packages for Windows, macOS and Linux.

## Maintained versions and follow-up checks

- `@types/node` is declared at major **26** (`^26.6.6`) and must track the supported Node 26 CI runtime; regenerate `pnpm-lock.yaml` through pnpm and review TypeScript/API changes for every future major upgrade.
- Electron is declared at **45.4.1** with a pnpm-generated lockfile (the stable patch published 2026-11-18); future Electron upgrades require Windows/macOS/Linux packaging and ASR worker protocol verification.
- pnpm was updated to the verified stable **12.22.0** via pnpm's own `self-update` and lockfile resolver. The `packageManagerDependencies` section in `pnpm-lock.yaml` tracks its version and artifact integrity. Maintained Actions setup steps use the same version; historical one-off release workflows remain untouched. See [Issue #231](https://github.com/kunlong-luo/voxnelo/issues/231).
- Optional manual workflows (deep UI QA, signed candidate, native Moonshine validation) remain real release gates where required; changing their `setup-node` value is **not** evidence they have run.
- Historical version-specific workflows (for example `publish-all-v1.0.3.yml`, `prepare-v0.1.7-draft-once.yml`) remain archived evidence and are not automatically regenerated.

The active review-only `v1.0.4-review-installers.yml` is not an archived publication workflow and remains subject to the maintained toolchain pin check. The pnpm-only native pilot migration is tracked in [PR #287](https://github.com/kunlong-luo/voxnelo/pull/287); CI success for historical installations is not evidence of the changed installation path.

## Developer checks

```sh
pnpm install --frozen-lockfile
pnpm check:toolchain
pnpm check:stable-deps
pnpm typecheck
pnpm lint
pnpm test:coverage
pnpm build
```

Cross-platform `desktop-package` workflow checks remain authoritative for native artifacts. Real-device permission, ASR quality, signing and actual publication are separate acceptance activities.

Tracking: [Issue #227](https://github.com/kunlong-luo/voxnelo/issues/227). References: [Node.js LTS schedule](https://nodejs.org/en/about/previous-releases), [Electron stable releases](https://releases.electronjs.org/?channel=stable).
