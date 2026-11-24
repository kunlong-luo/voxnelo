# Build dependency license inventory (engineering evidence, 2026-11-24)

Status: partial automation, **legal approval PENDING; v1.0.4 HOLD**. Source baseline `d06fdf32517dfa2795332d7153b4c838bda7d835`. The [prior static resource audit](https://github.com/kunlong-luo/voxnelo/pull/282#issuecomment-7121829162) observed no tracked font binaries, two public brand SVGs, a desktop PNG icon, and an empty reviewed audio manifest. This is a source inventory only; brand rights and final installer contents remain separate.

## Build evidence

The initial esbuild inventory produced two local, ignored reports under `build/license-inventory/`: `electron.json` (five esbuild entries) and `audio-worklet.json`. Each esbuild report includes package name, installed version, license metadata hint (or null), sum of positive emitted bytes across outputs, and count of external import occurrences. Paths, source contents and raw metafiles are not written. The reports are outside the current desktop packaging files and public Pages output; do not manually upload private build metadata. The source notice directory is explicitly unignored for maintenance, while generated reports remain ignored.

The inventory uses the last node_modules path segment (including scoped names and pnpm virtual stores), reads installed package.json, rejects inconsistent name/version metadata and aggregates duplicate package versions. A dependency whose emitted contribution is zero is not counted. External imports, copied runtime dependencies, virtual inputs outside node_modules, renderer/Rsbuild output, assets and native code are not proven by these reports. Emitted byte counts are not package file sizes. License metadata is a hint, never the complete license or a permission decision. No model, package version or runtime behavior is intentionally changed.

## Next acceptance steps

1. Require CI build and inventory tests to pass; inspect actual generated reports.
2. Validate the proposed renderer/Rspack module and chunk inventory in CI; audit remaining inlined CSS and assets.
3. Reconcile actual emitted inputs and externally copied npm packages against frozen lockfile versions and original LICENSE/NOTICE text, including non-SPDX and missing metadata cases.
4. Verify the original required notices inside final installers; assess all native, model and asset rights with a qualified reviewer.

Do not treat these reports as a full SBOM, independent license review, or release approval. Keep the previous review installer hashes historical, and build a new review-only candidate after necessary packaging remediation. No draft replacement, tagging or public publication.

## Renderer chunk inventory follow-up — 2026-11-24

Initial [PR #283 CI](https://github.com/kunlong-luo/voxnelo/actions/runs/45326424590) completed five jobs successfully at `3b71c536dd04959555871b39e938be5e88925314`. Core logs report three esbuild inventory unit cases passing and **zero** positive emitted npm packages for each esbuild target. That does not mean zero shipped dependencies: external imports, renderer output, assets and native payloads are separate. Audit PR #282 merged at `a9cc91c10ee49a18a9fae1b2edd76358a6165fdc`; the follow-up synchronizes with main and requires new checks.

The renderer plugin uses the [Rsbuild onAfterBuild hook](https://rsbuild.rs/plugins/dev/hooks) and [Rspack stats](https://rspack.rs/api/javascript-api/stats) to produce a third local report, `build/license-inventory/renderer.json`. It includes chunk-associated modules and nested concatenated members, reads installed package identity, deduplicates package/version, counts active and unidentified modules, and rejects a projection that fails to identify the required React dependency. No raw stats, module paths or source text are written. Unit cases cover nested members, inactive modules, deduplication, sanitized output and name mismatch. Renderer stats are a **candidate inventory**, not proof of positive emitted byte counts (unlike esbuild), exact lockfile reconciliation, CSS/loader or copied-asset coverage. Unidentified active modules require review. CI for this new code is pending; only the previous esbuild results are verified. Final notice collection, original license-text matching and final installer inspections remain open. **HOLD**.

## Root notice byte evidence — 2026-11-24

At the preceding Renderer head `786e60f86e0f573182f4467c7baae24ffc0f5360`, [CI 45333907167](https://github.com/kunlong-luo/voxnelo/actions/runs/45333907167) core, Windows and macOS logs each confirmed 16 chunk-associated npm package versions, zero unidentified active modules and zero positive emitted npm package versions for each esbuild target. The two renderer tests passed. The Linux packaging integrity step passed; installed-DEB and final aggregate checks were still pending at the initial observation. These counts are not a full shipped dependency inventory.

The follow-up upgrades the three build reports to schema 2. For each actual identified installed package root, read ordinary root-level LICENSE/LICENCE/COPYING/NOTICE/COPYRIGHT files (including conventional suffixes), record their relative basenames, exact byte lengths and SHA-256 digests, and count skipped matching directories, symlinks, empty and oversized files (2 MiB limit). Reports remain local/ignored, with no original notice text or package path. Conflicting evidence for duplicate package/version identities fails the inventory. Empty evidence lists are reported, not interpreted as permission or a missing legal obligation. Unit tests cover exact CRLF bytes, skipped directory/empty candidates, absent files and identity/conflict rejection.

This is bounded installed-package evidence, not independent npm tarball or lockfile-integrity verification, a nested notice search, an exhaustive SPDX analysis, or actual final installer notice matching. In particular, license metadata alone cannot substitute for original text. Next reconcile the package identities against the frozen lockfile and verified upstream package archives, inspect nested/alternate notices and copied runtime dependencies, and include applicable original notices in final distribution. Do not ship or publish raw inventories, approve a license, change model pins, or publish v1.0.4. **HOLD.** Follow-up CI pending.

## Renderer inventory merged and notice evidence synchronization — 2026-11-24

[PR #283](https://github.com/kunlong-luo/voxnelo/pull/283) merged at `39a9c6351dc7bed083ae0a2517adf85f5ce0ede0` after all five jobs in [CI 45333907167](https://github.com/kunlong-luo/voxnelo/actions/runs/45333907167) succeeded, including Linux installed-DEB checks. The original feature branch has been removed. The merged main tree is identical to the original PR #283 head tree (`e0a02fc290cbd2aad464573de93c7bbd351f4a5f`). PR #284 synchronizes with that merged commit and retains its seven notice-evidence changes. New CI is required for schema 2; previous schema 1 success does not certify it. Legal review and physical-microphone acceptance remain pending. **HOLD.**

## Frozen lockfile binding — 2026-11-24

[PR #284](https://github.com/kunlong-luo/voxnelo/pull/284) merged as `85a7bbeaa9e1d6a1cad5736c48857c226828922a` after all five jobs of [CI 45356776702](https://github.com/kunlong-luo/voxnelo/actions/runs/45356776702) succeeded; its work branch was removed. Core logs (job 138316433380) confirm 2/2 notice-evidence unit tests and 16 renderer package versions, zero unidentified active modules and zero packages without a recognized regular root notice file. Both esbuild targets reported zero positive emitted npm versions. This does not prove every necessary notice is collected or included in the installers.

The next change upgrades the local inventories to schema 3: bind each identified name/version to an exact registry SHA-512 SRI in the checked-in pnpm lockfile, and record the SHA-256 of the full lockfile bytes. Current pnpm 12.22.0 writes two YAML documents, both with lockfileVersion 9.0; the bounded reader scans packages sections in both, excludes snapshots, rejects conflicting duplicate resolutions and fails if an observed package has no supported exact integrity. It intentionally accepts only the current generated inline integrity-only registry resolution syntax, not arbitrary YAML or URL/git sources. Tests cover multiple documents, scoped identities, mismatches, duplicates and unsupported formats. No new dependency or network request is introduced. New CI remains pending.

A declared SRI is an expected tarball digest, **not a measurement of the downloaded archive or installed package**. Next independently verify upstream tarballs against SRI, match actual root/nested legal files and copied runtime dependencies, and verify final distribution notice coverage. Do not publish raw reports or approve legal rights automatically. v1.0.4 remains **HOLD**; no tag, draft replacement or public release.

## Schema 3 CI correction — 2026-11-24

[CI 45358679644](https://github.com/kunlong-luo/voxnelo/actions/runs/45358679644) on head `d69ebab19e11db535616d2e60114129f48a89aeb` passed all three platform packaging jobs but failed core quality at ESLint: four `no-regex-spaces` errors in the bounded lockfile reader. Core unit tests were not established by that failed run. Replace literal repeated indentation spaces in those four expressions with equivalent explicit quantifiers; no rule suppression or dependency change. Rerun all required checks before merge. Upstream tarball measurement remains pending, and v1.0.4 stays **HOLD**.

## Opt-in independent registry archive audit — 2026-11-24

[PR #285](https://github.com/kunlong-luo/voxnelo/pull/285) merged as `557025a3c245f22868574f5c4f5b29971ad39334` after all five jobs of [CI 45359217365](https://github.com/kunlong-luo/voxnelo/actions/runs/45359217365) passed; its feature branch was confirmed removed. Core job 138324666906 confirms three lockfile unit tests passed and 16 exact renderer registry resolutions matched. The earlier failed lint run remains recorded.

The next change adds a separate, explicit online audit:

```sh
pnpm build
pnpm license:audit:registry
````

Read all three schema 3 inventories, require their exact current lockfile SHA-256 and independently re-index the checked-in lockfile. Deduplicate actual package/version identities, construct only exact public npm registry archive URLs, reject redirects, bound each archive to 64 MiB and 60 seconds, measure its bytes against locked SHA-512 SRI, and record independent SHA-256 and byte count. No package execution, extraction, arbitrary URLs, credentials, dependency installation, default-build network access or release change. The local ignored `build/license-inventory/registry-archives.json` is written only after all archives match; remove prior report at start so failure cannot be mistaken for success. Offline unit tests cover integrity failure, exact URLs and stale/tampered/missing input reports. At initial submission, CI and actual online audit were pending. A successful archive digest does not yet compare installed LICENSE/NOTICE bytes or prove licensing rights; root/nested notice matching, copied dependencies, final installer notices and human legal/device approval remain pending. **HOLD.**

## Package-manager policy and merged archive-audit implementation — 2026-11-24

[PR #286](https://github.com/kunlong-luo/voxnelo/pull/286) merged as `51a46b9a93cc0e3682d5efd80be5030c5107fee9` after all five jobs of [CI 45359814822](https://github.com/kunlong-luo/voxnelo/actions/runs/45359814822) passed. Offline tests and packaging success do not establish that the opt-in online command has actually downloaded the 16 identified archives. Independent live registry audit remains pending.

**Package-manager policy:** pnpm is the sole supported JavaScript package manager; the public npm registry remains the upstream archive source, not a command-line tool. The explicit audit uses the Node fetch API, not the registry provider's CLI; preserve immutable upstream references, registry SHA-512 SRI and measured archive evidence. The current schema 3 build writes renderer, electron and audio-worklet reports. See [Development](../DEVELOPMENT.md) and [toolchain policy](NODE26-LTS-MIGRATION.md). The separate [pnpm-only migration PR #287](https://github.com/kunlong-luo/voxnelo/pull/287) is under CI review. No model, license approval or release state changes. **HOLD.**

## Merged pnpm and repeatable registry evidence

PR #287 and PR #289 have merged. [Registry audit and quality rubric](../release/V1.0.4-REGISTRY-AUDIT.md) records both successful live 16/16 archive integrity runs, identical downloaded JSON report bytes and remaining notice/legal gaps. Do not treat earlier pending historical entries as the current status. No publication authorized.
