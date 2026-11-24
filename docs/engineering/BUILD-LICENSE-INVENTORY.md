# Build dependency license inventory (engineering evidence, 2026-11-24)

Status: partial automation, **legal approval PENDING; v1.0.4 HOLD**. Source baseline `d06fdf32517dfa2795332d7153b4c838bda7d835`. The [prior static resource audit](https://github.com/kunlong-luo/voxnelo/pull/282#issuecomment-7121829162) observed no tracked font binaries, two public brand SVGs, a desktop PNG icon, and an empty reviewed audio manifest. This is a source inventory only; brand rights and final installer contents remain separate.

## Build evidence

The existing `pnpm build` produces two local, ignored reports under `build/license-inventory/`: `electron.json` (five esbuild entries) and `audio-worklet.json`. The report includes package name, installed version, license metadata hint (or null), sum of positive emitted bytes across outputs, and count of external import occurrences. Paths, source contents and raw metafiles are not written. The reports are outside the current desktop packaging files and public Pages output; do not manually upload private build metadata. The source notice directory is explicitly unignored for maintenance, while generated reports remain ignored.

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
