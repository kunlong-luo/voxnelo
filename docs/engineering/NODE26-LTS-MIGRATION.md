# Node.js 26 LTS migration — 2026-11-21

## Purpose and verified baseline

Voxnelo uses Node.js as its build and test runtime; Electron embeds its own independent Node.js runtime. Upgrading CI Node does not upgrade the Node version inside installed Electron applications.

- PR [#228](https://github.com/kunlong-luo/voxnelo/pull/228) validated the full required `check` job plus Windows, macOS and Linux desktop-package integrity on Node.js 26 LTS. CI included Linux DEB installation, not a device microphone test.
- Vitest/jsdom tests initially failed because Node.js 26 reserves global Web Storage names. `tests/setup-jsdom-storage.ts` now restores jsdom's *real* `localStorage` and `sessionStorage` objects, guarded by `tests/jsdom-storage-compat.test.ts`. No application storage code or ASR code was changed.
- Maintained Actions workflows are aligned to Node.js 26. Version-pinned, disabled historical publish workflows are deliberately **not** edited or re-run.

## Toolchain policy

1. Use supported **stable/LTS** Node.js, not Current, nightly, alpha, beta or RC.
2. Pin pnpm with a reproducible `packageManager` version and integrity checksum; never alter the lockfile or that hash by hand.
3. Use `pnpm install --frozen-lockfile` on CI, keep TypeScript/lint/unit tests/build/security audits and cross-platform package gates intact.
4. Keep Electron's embedded Node version separate from the build-runtime version and validate native packages for Windows, macOS and Linux.

## Remaining compatibility upgrades

- `@types/node` in `package.json` remains on major **22** after the first CI-runtime migration. Dependabot's major-version ignore has now been removed so it can propose an `@types/node` **26** update with a generated `pnpm-lock.yaml`. Review the resulting TypeScript/API changes and re-run the normal CI before merging.
- Electron was pinned to **45.3.4** in the lockfile at the time of this document; stable **45.4.1** was published on 2026-11-18. Upgrade using pnpm/Dependabot and validate packaging and ASR worker protocols.
- pnpm was pinned to **12.11.2**. Check upstream stable pnpm 12 patches, regenerate Corepack integrity and lockfile with the package manager, and update all maintained Action setup steps in a dedicated PR. Do not silently replace the lockfile signature.
- Optional manual workflows (deep UI QA, signed candidate, native Moonshine validation) remain real release gates where required; changing their `setup-node` value is **not** evidence they have run.
- Historical version-specific workflows (for example `publish-all-v1.0.3.yml`, `prepare-v0.1.7-draft-once.yml`, `v1.0.4-review-installers.yml`) remain archived evidence and are not automatically regenerated.

## Developer checks

```sh
pnpm install --frozen-lockfile
pnpm check:stable-deps
pnpm typecheck
pnpm lint
pnpm test:coverage
pnpm build
```

Cross-platform `desktop-package` workflow checks remain authoritative for native artifacts. Real-device permission, ASR quality, signing and actual publication are separate acceptance activities.

Tracking: [Issue #227](https://github.com/kunlong-luo/voxnelo/issues/227). References: [Node.js LTS schedule](https://nodejs.org/en/about/previous-releases), [Electron stable releases](https://releases.electronjs.org/?channel=stable).
