# Build dependency license inventory (engineering evidence, 2026-11-24)

Status: partial automation, **legal approval PENDING; v1.0.4 HOLD**. Source baseline `d06fdf32517dfa2795332d7153b4c838bda7d835`. The [prior static resource audit](https://github.com/kunlong-luo/voxnelo/pull/282#issuecomment-7121829162) observed no tracked font binaries, two public brand SVGs, a desktop PNG icon, and an empty reviewed audio manifest. This is a source inventory only; brand rights and final installer contents remain separate.

## Build evidence

The existing `pnpm build` produces two local, ignored reports under `build/license-inventory/`: `electron.json` (five esbuild entries) and `audio-worklet.json`. The report includes package name, installed version, license metadata hint (or null), sum of positive emitted bytes across outputs, and count of external import occurrences. Paths, source contents and raw metafiles are not written. The reports are outside the current desktop packaging files and public Pages output; do not manually upload private build metadata. The source notice directory is explicitly unignored for maintenance, while generated reports remain ignored.

The inventory uses the last node_modules path segment (including scoped names and pnpm virtual stores), reads installed package.json, rejects inconsistent name/version metadata and aggregates duplicate package versions. A dependency whose emitted contribution is zero is not counted. External imports, copied runtime dependencies, virtual inputs outside node_modules, renderer/Rsbuild output, assets and native code are not proven by these reports. Emitted byte counts are not package file sizes. License metadata is a hint, never the complete license or a permission decision. No model, package version or runtime behavior is intentionally changed.

## Next acceptance steps

1. Require CI build and inventory tests to pass; inspect actual generated reports.
2. Add a renderer/Rspack module and chunk inventory with equivalent path sanitization, including inlined CSS and assets.
3. Reconcile actual emitted inputs and externally copied npm packages against frozen lockfile versions and original LICENSE/NOTICE text, including non-SPDX and missing metadata cases.
4. Verify the original required notices inside final installers; assess all native, model and asset rights with a qualified reviewer.

Do not treat these reports as a full SBOM, independent license review, or release approval. Keep the previous review installer hashes historical, and build a new review-only candidate after necessary packaging remediation. No draft replacement, tagging or public publication.
