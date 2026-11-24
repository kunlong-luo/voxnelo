# Voxnelo — public native ASR release decision gate

**Status for v1.0.4 native expansion: NOT APPROVED FOR PUBLICATION (pending evidence).** This gate separates CI-ready **internal candidates** from an accepted public native ASR rollout. It does not supersede the frozen V0.1 PRD, revoke the already public v1.0.3 unsigned release, or declare #45 complete. See [pinned upstream license evidence](MOONSHINE-V1.0.4-LICENSE-EVIDENCE.md), the [2026-11-23 model SHA and original-Wheel rights reconciliation](MOONSHINE-V1.0.4-PROVENANCE-AND-NOTICES-2026-11-23.md), the [exact eight-hash upstream evidence request (not sent)](MOONSHINE-UPSTREAM-EVIDENCE-REQUEST-2026-11-23.md), and the [per-platform real human microphone evidence ledger](../release/V1.0.4-PHYSICAL-DEVICE-EVIDENCE.md) (all current new-engine sign-offs pending).

## Release boundaries

- **Standard package (no staged model):** may be evaluated for an Early Access release against the F001–F012 acceptance matrix, but must explain that native local dictation is not bundled, and must not promise universal offline ASR.
- **Internal ASR candidate:** permitted only for controlled build/test; a reproducible WAV result or valid SHA-256 manifest does not authorize publication.
- **Public expanded native-ASR v1.0.4 installer:** HOLD until the relevant new-platform evidence below has a reviewer, dated artifact SHA and explicit release approval. The owner has explicitly allowed **unsigned** desktop releases with SmartScreen/Gatekeeper/notarization limitations accurately disclosed; signature is optional, not an automatic release blocker. However, the unsigned decision does **not** waive license, privacy, real microphone or functionality review. Never treat an Actions artifact or a successful private Draft as automatic authorization to publish.

**Model-version fork (2026-11-24):** The [immutable-source comparison of Moonshine 0.0.65 versus 0.1.6](MOONSHINE-VERSION-MIGRATION-DECISION-2026-11-24.md) records a changed model URL, split streaming front-end files, optional word-timestamp decoder, and upstream Windows/VAD improvements. None has been implemented or independently benchmarked in Voxnelo. The current release gate still applies to the **pinned 0.0.65 candidate**; a proposed 0.1.6 upgrade would be a separate PR with **new pinned Python 3.12 Wheel/model SHA inventories, license/NOTICE review, native compatibility and real-human microphone acceptance**, not a workaround for unresolved rights or an automatic publication signal.

## Evidence ledger (complete separately for each OS/arch and exact artifact SHA-256)

| Gate | Required evidence | Current decision |
| --- | --- | --- |
| Model provenance and distribution rights | Upstream model URL + immutable revision + verified weight hashes; reviewed license text, attribution/notice obligations and redistribution scope | **Upstream MIT model-family statement recorded**; only **2/8** candidate model hashes match the currently available dated official mirror manifest, so immutable exact-byte asset mapping and redistribution/notices remain **PENDING** ([comparison](MOONSHINE-V1.0.4-PROVENANCE-AND-NOTICES-2026-11-23.md)) |
| Native runtime distribution rights | Exact native package/version/source, all transitive dynamic library licenses, redistribution rights, notices and reviewed hashes | Complete per-platform Python 3.12 Wheel hashes enforced and native CI-verified; [actual read-only three-OS original-Wheel recheck #45188947162](https://github.com/kunlong-luo/voxnelo/actions/runs/45188947162) found **0 missing declared License-File paths** on all targets. The [private original-Wheel LICENSE/NOTICE text reviewer export](MOONSHINE-PRIVATE-LICENSE-TEXT-REVIEW-2026-11-24.md) is available as an opt-in offline handoff with tracked hash-snapshot binding and executable/model-name rejection, but its output has not been reviewed or approved; actual legal texts, embedded runtime linkage, attribution and third-party rights **remain PENDING** |
| ABI/runtime compatibility | Exact Electron/Node ABI, OS/arch, installer SHA-256, native module load and end-to-end transcript on installed build | **Pending physical-platform QA** |
| Privacy and consent | Mic access only after explicit action, offline path verified, on-disk artifacts and permissions checked; online transfer absent unless specifically opted in | **Pending physical-device QA** |
| Recognition quality | Consented nonsensitive real-microphone quiet/noise paired set (≥10 sentences per condition per OS), weighted WER, **two screen-visible latency measurements covering every quiet+noisy trial** rather than a few successful trials, with explicit missing-caption/failure records | **Pending measured human data** |
| Reliability | 10-minute session, repeated Stop/restart and sentence changes, mic disconnect/permission rejection, resource cleanup; #38 evidence | **Pending physical-device QA** |
| Visual and accessibility | #55 U3 two-theme review, keyboard/font/DPI Windows/macOS/Linux observations | **Pending design sign-off** |
| Signing and delivery | Signed vs unsigned decision, fresh install/in-place upgrade preserving local records, artifact checksum and truthful release notes | **Unsigned expressly chosen by owner**; install/upgrade and risk-disclosure evidence still **pending** |
| F001–F012 learning flow | Filled `V0.1-ACCEPTANCE-MATRIX.md` with real user/device evidence, including copyright/content checks | **Pending acceptance** |

Use evidence entries of the form:
`gate | tested artifact SHA-256 | OS/arch | reviewer/date | evidence reference (no private paths or audio) | pass/fail/waiver with rationale`.

### Original-Wheel metadata identity and evidence interpretation (2026-11-24)

In addition to SHA-256 and the `License-File` presence checks, the read-only original-Wheel inspector must now bind the top-level `.dist-info` root to the exact normalized pinned distribution/version. This prevents assigning a foreign package's legal-file inventory to the candidate Wheel. The [Moonshine provenance and NOTICE audit](MOONSHINE-V1.0.4-PROVENANCE-AND-NOTICES-2026-11-23.md) distinguishes older successful inventories from the subsequent stricter check, which **passed against real original Wheel files on all three platforms** in [run #45294831570](https://github.com/kunlong-luo/voxnelo/actions/runs/45294831570) at source head `d19c5bc34b11cb054e07821d78ef22868d7cc1c1`. A passing root-identity check is **not** a signature, legal clearance, actual runtime linkage proof or authorization to publish.


### Human microphone evidence sample-coverage guard (2026-11-24)

The [private physical-device evidence auditor](../release/V1.0.4-PHYSICAL-DEVICE-EVIDENCE.md) now flags either UI latency metric unless its observation count is **exactly quiet.trials + noisy.trials on the same OS** (one first-visible and one final-visible event per attempted sentence), refuses unsafe WER integer sums, caps input summaries at 256 KiB, and suppresses unrecognized input keys from diagnostic output; it also refuses future-dated test records (with a one-day UTC allowance for time zones). This prevents a structurally complete-looking report based on just one easy subtitle result or extra unrelated timing samples while requiring at least 20 real trials. Missing interim/final events are defects to document privately, **not** permission to drop failed rows from p50/p95. The check examines only self-reported summary fields, not original measurements, speaker identity, audio/video or consent; **no release or real-device approval follows**.

### First-party desktop license packaging check (2026-11-24)

A source audit found that the Electron-builder file/resource allowlists did not **explicitly** include Voxnelo's root MIT `LICENSE`. Future native installer candidates now carry an accessible `resources/LICENSE` copy through `extraResources` and the real three-platform package inspection verifies its bytes against the source LICENSE. This guards **only the application's own notice**; it does not authenticate any third-party license, ship Electron/npm transitive notices, resolve exact Moonshine model rights or authorize v1.0.4 publication. In addition, the four Linux DEB pipelines run a `dpkg -L` + byte-for-byte validation **after actual apt installation**, since unpacked `resources/LICENSE` alone is not proof of installed-package contents. Windows/macOS checks verify their unpacked Electron applications, not an end-user NSIS GUI install or DMG mount. Existing older private Draft assets are not updated by source changes. See [release operations](RELEASE-OPERATIONS.md).


### Exact-source candidate and shipped Linux third-party notice inventory (2026-11-24)

The [candidate handoff](../release/V1.0.4-REVIEW-ARTIFACT-HANDOFF-2026-11-24.md) records all eight successful jobs of review run `45318769948`, source `be89e098a0c9593f1f87ff8ea6baba2ef9c107ea`, and five independently measured installer SHA-256 values. This is an internal unsigned review build; its manifests expressly deny release approval. Physical-mic QA, legal review and the old Draft remain separate.

Read-only inspection of the SHA-verified Linux `voxnelo_1.0.4_amd64.deb` (SHA-256 `7f5d5b21797c63154ab79a37bb84fc7906fc2a093bf59d968a67a04f8fd1b681`) extracted its data with `dpkg-deb -x` and parsed the ASAR header and package metadata without executing installed code. Under `/opt/Voxnelo/` the following actual files were observed:

| Shipped member | Bytes | SHA-256 |
| --- | ---: | --- |
| `LICENSE.electron.txt` | 1096 | `5154e165bd6c2cc0cfbcd8916498c7abab0497923bafcd5cb07673fe8480087d` |
| `LICENSES.chromium.html` | 5598206 | `214152f78cc0b611f63ff8faefcc6670c4605ffbff05f092bb671e6df80ce741` |
| `resources/LICENSE` | 1077 | `c419e60283cfcb8c5bb56e0cd7e4e7f37fef6b6d2d29a08eab2d134c1558a438` |
| `resources/app.asar` | 52917609 | `ed6adc7f15061911d683639c8ce0959a4212106aa8055ff5ae89d908a3f35462` |

The ASAR has 8150 file members. All 18 independently identifiable top-level/scoped npm distributions have a package-level LICENSE file. Their package.json declarations and notice filenames are:

| Package | Version | Declared license | Package-level files |
| --- | --- | --- | --- |
| @babel/runtime | 7.29.10 | MIT | LICENSE |
| @base-ui/react | 1.9.0 | MIT | LICENSE |
| @base-ui/utils | 0.5.0 | MIT | LICENSE |
| @floating-ui/core | 1.8.0 | MIT | LICENSE |
| @floating-ui/dom | 1.8.0 | MIT | LICENSE |
| @floating-ui/react-dom | 2.1.9 | MIT | LICENSE |
| @floating-ui/utils | 0.2.12 | MIT | LICENSE |
| @formkit/auto-animate | 0.10.2 | MIT | LICENSE |
| class-variance-authority | 0.7.1 | Apache-2.0 | LICENSE |
| clsx | 2.1.1 | MIT | license |
| dexie | 4.4.7 | Apache-2.0 | LICENSE, NOTICE |
| lucide-react | 1.74.0 | ISC | LICENSE |
| react | 19.3.1 | MIT | LICENSE |
| react-dom | 19.3.1 | MIT | LICENSE |
| reselect | 5.3.0 | MIT | LICENSE |
| scheduler | 0.28.0 | MIT | LICENSE |
| tailwind-merge | 3.7.0 | MIT | LICENSE.md |
| use-sync-external-store | 1.7.0 | MIT | LICENSE |

Two generated renderer notice sidecars were also observed: `dist/static/js/k.5869a2c8de.js.LICENSE.txt` (SHA-256 `9c903dd73627e8eac8f63650cee24cbd136fc569322d7e94a85692f195bd839e`) and `dist/static/js/lib-react.0589e6ad37.js.LICENSE.txt` (SHA-256 `e47a413b62a5bf023d2b81a25d0ef4213ff1bb756df7f3c31ba57f88334e1e0f`).

**Scope limitation:** this is Linux DEB file-presence and declared-license evidence, not an exhaustive production SBOM or a review of the legal text. It does not establish coverage for dependencies inlined in renderer bundles, embedded native components, fonts/assets, or the separate Windows NSIS, macOS DMG and Linux AppImage distributions. Review the full license and NOTICE texts, reconcile the bundled-module inventory against the production lockfile and build metadata, inspect each remaining installer and record reviewer/date and exact artifact hash. Keep the separate [Moonshine legal evidence](MOONSHINE-V1.0.4-LICENSE-EVIDENCE.md) and exact eight-model-file provenance gap open. No third-party legal clearance, direct-human microphone approval or publication is implied.


### Linux AppImage shipped-content comparison — 2026-11-24

Independently rehashed `Voxnelo-1.0.4.AppImage` (132641993 bytes, SHA-256 `0faeebc7ac35d140f2c7ae4ea47079defa58860adfdb2ea67540b216c6d133d9`) from review run `45318769948`. Read its embedded SquashFS v4 filesystem (offset 188392, gzip compression) using a read-only parser without executing AppRun, mounting or running candidate code. The 101 enumerated non-root filesystem entries include `/LICENSE.electron.txt`, `/LICENSES.chromium.html`, `/resources/LICENSE` and `/resources/app.asar`; each was read and independently SHA-256 hashed and matches the exact DEB member in the table above. This extends the existing 18-package ASAR file-presence evidence to these identical bytes, not to the entire AppImage or a legal approval.

The AppImage also contains six regular ELF files under `/usr/lib/` (not merely symlinks). Observed exact byte identities:

| AppImage member | Bytes | SHA-256 |
| --- | ---: | --- |
| `libXss.so.1` | 14488 | `270fe6e4d430118793d01cac5c6081d0ea9e244cfcf510475bc779bef21b754a` |
| `libXtst.so.6` | 22880 | `38f9ccb12d2c477aad85db6279afc334d9f250f613884c188ace7232b83e9b68` |
| `libappindicator.so.1` | 52128 | `033b8803f20b98e8cd56fc8e75e3a71a552f75c0cff9bd0937f3ddd6ee5d2145` |
| `libgconf-2.so.4` | 192296 | `ba977334112bb81f6457ee4aad833c6d5f1ff731c718073cd50777d613b23185` |
| `libindicator.so.7` | 60648 | `3b61ae3424c4800975c1806245a2d286f6e1fc49cd9350913075c27a95f3c7a0` |
| `libnotify.so.4` | 31304 | `8f42294247a886c5a94b2a0ce1c0b65e953616d7efe8da664b3826cdeae47948` |

No separate `/usr/share/doc/` tree was observed in this enumerated filesystem. This does not establish that a notice is absent from every shipped notice collection or that any license was violated. Identify exact distribution/build source and licensing terms for each of these six binaries; check notice/source-availability obligations and whether existing shipped texts meet them. Do not assume that the DEB's system dependencies and the AppImage's bundled binaries have identical distribution obligations. Windows NSIS and macOS DMG inner contents remain unverified in this review environment; those installer formats require independent read-only inspection, not extrapolation from Linux. All manual rights, human physical microphone and release approvals remain PENDING; HOLD.

## Automation boundaries and known code risk

- `scripts/check-asr-staging.mts` proves inventory/integrity, **not** lawful redistribution.
- `scripts/check-asr-real-release.mts` runs a reference WAV check when a staged manifest exists; it now requires exact boolean `releaseReady:true` when native assets are staged, and rejects absent, false, null, and nonboolean approvals. This **fail-closed technical check does not grant legal authorization**; reviewers must establish all evidence before setting approval.
- `.github/workflows/release.yml` uploads **unsigned, time-limited candidate artifacts**; successful CI does not fulfill signature, real-hardware, legal or human WER requirements.
- `pnpm asr:batch` reports private offline WAV aggregate WER/RTF; it does not measure live partial/final subtitle latency or device DSP.
- `pnpm asr:moonshine:upstream:refs` is an **opt-in**, read-only upstream reference audit. It compares version-tagged immutable text catalogs and cannot approve model rights; exit 2 for no `v0.0.65` tag, incomplete eight legacy SHA-256 catalog or unavailable upstream metadata must **not** be converted to release approval. See the [publisher evidence request](MOONSHINE-UPSTREAM-EVIDENCE-REQUEST-2026-11-23.md).

**Release owner decision: HOLD public v1.0.4 expanded native-ASR rollout pending new evidence.** The current standard installers do not bundle SDK or model weights; the user must explicitly install optional Moonshine components. Public v1.0.3 exists as a separate historical unsigned release. The private v1.0.4 Draft still targets commit `4aeb58e`, whereas `main` moved after the dependency-security fix; do not claim a fresh main build or overwrite draft/public artifacts. Keep #45/#123 open until the relevant new-engine evidence is approved. Never upload personal microphone recordings, device IDs, transcripts or private model paths to the repository.
