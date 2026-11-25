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


### macOS DMG and Windows NSIS payload audit — 2026-11-24

This refresh independently rehashed both original installer files from the three-platform review inputs of run `45318769948` and source `be89e098a0c9593f1f87ff8ea6baba2ef9c107ea`. No candidate executable was run. It supersedes the earlier pending macOS/Windows inner-file inventory status, not the outstanding legal or live-device gates.

- macOS: `Voxnelo-1.0.4-arm64.dmg`, 127336240 bytes, SHA-256 `86d166d81d2cbd4661bb6ef14ebe1c05f8b60f49aca66e662999e4ac0bf2f831`. Read the UDIF footer and zlib block map, then the HFS+ volume/catalog/data forks without mounting. Enumerated 283 file and 317 folder catalog records. All four selected files under `Voxnelo.app/Contents/Resources/` (first-party LICENSE, Electron LICENSE, Chromium LICENSES, app.asar) exactly match the measured Linux DEB hashes above. App Info.plist identifies app.voxnelo.desktop v1.0.4.
- Windows: `Voxnelo Setup 1.0.4.exe`, 125512212 bytes, SHA-256 `566b9e442efe505805916ff71b94832b05062ff0be75237decb5c73d65ebc1f3`. Located the embedded 7z payload at offset 170285; verified start and next-header CRCs and read 85 archive entries via libarchive without executing NSIS. Payload size 124956814 bytes, SHA-256 `10e1ed8f26b3580004a85ac5889214a2f46fed85b85845c0a4cd44d281e59978`. This is inspection of the application payload, not the entire NSIS bootstrapper/plugin/installation lifecycle.

| Windows payload member | Bytes | Independently measured SHA-256 |
| --- | ---: | --- |
| `LICENSE.electron.txt` | 1096 | `5154e165bd6c2cc0cfbcd8916498c7abab0497923bafcd5cb07673fe8480087d` |
| `LICENSES.chromium.html` | 5705935 | `7dac8267ac6da8d959cfe88f5f055b18a397f10230380b5329125e167bf5639b` |
| `resources/LICENSE` | 1077 | `c419e60283cfcb8c5bb56e0cd7e4e7f37fef6b6d2d29a08eab2d134c1558a438` |
| `resources/app.asar` | 52917635 | `ab603096bf4a036fde4e5dfc4e64c67d923ce214d16e47d1ef1c77cbda50f5e0` |

Windows Chromium notices and ASAR differ from Linux/macOS; do not substitute the other platform's hashes. Independent parsing of Windows and macOS ASARs located 8150 offset-backed members each, the same 18 independent npm distributions/versions/license declarations in the Linux table, and 19 package-level LICENSE/NOTICE files (18 licenses plus Dexie NOTICE) with identical per-file hashes across Windows/macOS. Two generated JS license sidecars have the same content digests as Linux, though Windows names its first `dist/static/js/g.25b5af3121.js.LICENSE.txt`. The ASARs share 8146 paths; three shared paths have differing bytes (two brand SVGs and index.html); each has four distinct renderer output paths. This is not evidence of a functional defect or identical builds: investigate reproducibility separately if required.

The actual macOS native frameworks under `Voxnelo.app/Contents/Frameworks/<name>.framework/Versions/A/<name>` were located and hashed (real Mach-O binaries, not framework symlink records):

| Framework | Observed Info.plist version | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| Electron Framework | 45.4.1 (build) | 207632704 | `32cc27ed1fb354dad8872006faaac78e9721bdbd1013b26854c06c50bc806447` |
| ReactiveObjC | 3.1.0 | 352960 | `68d3d635482b079ebcb6487d9bacd6791bf25e9ce730cd36f82f899e82a8215f` |
| Squirrel | 1.0 | 216672 | `296e443eb9c42eade25b34f60a3d7a0e31259aeab263ffe71f1bbad64e50bdfd` |
| Mantle | 1.0 | 126656 | `8fb457b9689ae66e2891e5b260b087612420d27aab6aa082f6a9ba3d61a66a4f` |

Info.plist values are bundle metadata, not immutable upstream source attestations. Map each actual framework to its exact upstream license/notice and review its coverage in the delivered notice collection. Windows NSIS bootstrapper, native components, Windows-specific Chromium notice contents, macOS frameworks, six AppImage ELF files, renderer-inlined dependencies and fonts/assets still need full rights and attribution review. All four installer formats now have preliminary actual payload inventories; none has full third-party legal approval. Direct-human microphone acceptance remains pending on all three OSes. **HOLD**, no publication or draft changes.


### Pinned macOS upstream legal-text reconciliation — 2026-11-24

Read the actual [Electron v45.4.1 DEPS](https://github.com/electron/electron/blob/v45.4.1/DEPS) and its [license-credits patch](https://github.com/electron/electron/blob/v45.4.1/patches/chromium/add_electron_deps_to_license_credits_file.patch) at the version observed in the DMG. The patch adds source license inputs for Node.js, Squirrel, Mantle, ReactiveObjC and Sparkle to the Chromium credits generator. Fetched the following original license files from the exact dependency commits declared by DEPS. Blob IDs are Git object identifiers, not SHA-256 values of shipped frameworks.

| Upstream dependency / license text | Git blob ID | Observed obligations / review notes |
| --- | --- | --- |
| [Squirrel.Mac LICENSE](https://github.com/Squirrel/Squirrel.Mac/blob/fffea30e4a339a7f7d69a3391314b72548d209bd/LICENSE) | `5947a9ffe98ba34011ae42b2851e6fdf050b3ddd` | MIT notice retention; the text explicitly identifies bundled Sparkle BinaryDelta, bsdiff and sais-lite and includes their notices. bsdiff's binary distribution clause requires accompanying copyright, conditions and disclaimer. |
| [ReactiveObjC LICENSE.md](https://github.com/ReactiveCocoa/ReactiveObjC/blob/74ab5baccc6f7202c8ac69a8d1e152c29dc1ea76/LICENSE.md) | `49bc37468d432900e63a13929c4ca0bdf39f04cc` | MIT copyright and permission notice retention. |
| [Mantle LICENSE.md](https://github.com/Mantle/Mantle/blob/2a8e2123a3931038179ee06105c9e6ec336b12ea/LICENSE.md) | `4e9825ac272bdbab7e56f9bc5b27fb583144dfc7` | MIT plus a Proton code notice and non-endorsement clause; preserve the complete original text rather than replacing it with generic MIT. |
| [Sparkle LICENSE](https://github.com/sparkle-project/Sparkle/blob/79bc9e872948e47877e76f194cb0c8e0412b0b90/LICENSE) | `abe6e04c37e0b94e3a25078b6fd4abdafc299af4` | MIT plus external notices for bsdiff, sais-lite, Ed25519 and SUSignatureVerifier; assess which code is actually included and retain applicable original terms. |

**Evidence boundary:** this is an exact source-revision legal-text inventory and technical reading, not a proof that shipped Mach-O binaries were built from these sources, that every credits section survived packaging, or a human approval. Next, compare the actual SHA-bound DMG `LICENSES.chromium.html` against complete applicable upstream texts (including sub-notices; normalize only markup/whitespace), record any omissions and reviewer disposition. Do not infer absence from the presence of a generic MIT label. The six AppImage ELF files still lack an exact versioned binary-to-distribution-source mapping. Public Debian/Ubuntu package records provide research leads, not evidence of the binary identity; attempted Debian latest-copyright URLs were not retrievable during this review. No AppImage license clearance is recorded. No model pin, installer, draft, tag or release is changed. All legal and human-microphone gates remain PENDING.


### Actual macOS credits reconciliation — 2026-11-24: notice coverage gap, HOLD

Re-read the original DMG from the exact-source review archive (run `45318769948`, source `be89e098a0c9593f1f87ff8ea6baba2ef9c107ea`). Independent DMG SHA-256 `86d166d81d2cbd4661bb6ef14ebe1c05f8b60f49aca66e662999e4ac0bf2f831`; extracted HFS+ member `Voxnelo.app/Contents/Resources/LICENSES.chromium.html`, 5598206 bytes, SHA-256 `214152f78cc0b611f63ff8faefcc6670c4605ffbff05f092bb671e6df80ce741`. No mounting or execution. Parsed 498 `div.product` credits sections and their license preformatted text; also searched the raw HTML independently of section titles.

| Upstream input (pinned in Electron DEPS) | Actual DMG notice observation | Disposition |
| --- | --- | --- |
| Squirrel.Mac | Exactly one Squirrel section. Extracted preformatted UTF-8 text produces Git blob SHA-1 `5947a9ffe98ba34011ae42b2851e6fdf050b3ddd`, identical to the previously fetched immutable upstream LICENSE. Includes BinaryDelta, Colin Percival/bsdiff and Yuta Mori/sais-lite. | Exact text match; reviewer approval still pending. |
| ReactiveObjC | No named section, no raw HTML occurrence of ReactiveObjC or the exact upstream copyright marker `2012 - 2016, GitHub`. Its native framework was located in the DMG earlier. | **Notice coverage not demonstrated; investigate/remediate before publication.** |
| Mantle | No named section or raw HTML occurrence of Mantle, Bitswift or Proton framework. Mantle.framework is present. | **Notice coverage not demonstrated; investigate/remediate before publication.** |
| Sparkle | Squirrel section retains Sparkle BinaryDelta notices; no separate Sparkle section or SUSignatureVerifier marker. An Orson Peters mention in the foldhash section does not establish Sparkle coverage. | Determine actual incorporated Sparkle code and applicable notices. |

A case-insensitive scan of the DMG catalog's member basenames for license/notice/copyright/credits/legal located only the three previously recorded Resources files (first-party LICENSE, LICENSE.electron.txt, LICENSES.chromium.html). The ASAR filename inventory did not locate separately named framework license files; unrelated lucide icon filenames are not evidence. This is a **confirmed gap in the examined credits collection**, not proof of a legal violation or exhaustive absence of text from every possible resource. Upstream credits-generation patch presence is insufficient. The extracted Squirrel Git blob SHA-1 is a source-object comparison, not a binary SHA-256.

**Remediation worklist:** locate any additional applicable original notices and substantiate them in the actual distributed payload. If absent, add a dedicated, accessible third-party notice resource preserving complete pinned ReactiveObjC and Mantle texts (including Proton), plus applicable Sparkle and other native notices; bind notice inputs to exact upstream commits and verified digests. Add a fail-closed packaging regression for expected notice content and verify every platform's actual unpacked/installed payload. If packaging bytes change, generate a separate exact-source review build, record new installer hashes, and bind device acceptance to those new bytes; do not reuse run 45318769948 as evidence for a changed installer. A qualified reviewer must decide applicability and approve all actual license/notice content. No source, model pins or candidate binaries are changed by this documentation-only finding. The old draft remains untouched and unpublished; HOLD.


### Packaging tool provenance checkpoint — 2026-11-24

For historical review run `45318769948` (source `be89e098a0c9593f1f87ff8ea6baba2ef9c107ea`), inspected original successful platform job logs and the locked source dependency inventory. This is toolset identification, not legal approval or an attestation of exact bundled native library bytes.

| Platform | Observed evidence | Remaining work |
| --- | --- | --- |
| Linux AppImage | [Linux job 138193262398](https://github.com/kunlong-luo/voxnelo/actions/runs/45318769948/job/138193262398) explicitly logs download of `appimage-12.0.1.7z` | Recover and independently hash that exact original tool archive, map its x64 library payload to the six previously recorded installer hashes and obtain versioned distribution copyright/source records. |
| Windows NSIS | [Windows job 138193262385](https://github.com/kunlong-luo/voxnelo/actions/runs/45318769948/job/138193262385) explicitly logs electron-builder 26.18.0, `nsis-3.0.4.1.7z`, `nsis-resources-3.4.1.7z`, and `7zip-win-x64.tar.gz` | Recover exact tool archive identities and inspect incorporated bootstrapper, plug-ins and compression code; distinguish build-only utilities from redistributed bytes. |

The [electron-builder-binaries historical appimage-12.0.1 tag](https://github.com/electron-userland/electron-builder-binaries/tree/appimage-12.0.1) resolves to commit `57839c6516289c0412c1b0887a6718d71e1ac5c2`. Its [Makefile](https://github.com/electron-userland/electron-builder-binaries/blob/57839c6516289c0412c1b0887a6718d71e1ac5c2/Makefile) changes reference AppImageKit release 12 runtime downloads and a publish recipe for version 12.0.0. This is a historical source lead, not a manifest for every byte of the downloaded 12.0.1 archive. The newer [toolset build script at fixed commit 4fa56c6](https://github.com/electron-userland/electron-builder-binaries/blob/4fa56c60939d96f8ee2687670611909c1d1eb42d/packages/appimage/assets/build-appimage.sh) explicitly copies the same six library names (with architecture-dependent appindicator/indicator aliases) and contains license collection logic; it is not the old 12.0.1 build script and its newer license inventory must not be attributed to that old toolset. The exact historical library versions, build sources and applicable obligations remain **PENDING**. No claim of legal clearance, license violation, or successful byte mapping is made.

PR #281 is separately validating the supplemental macOS notice correction and installed DEB checks. Do not invalidate that run by appending unrelated research commits. Once its changes are integrated, a fresh exact-source review-only build and new independent installer hashes are required. All direct-human mic and legal approval gates remain PENDING; **HOLD**.


### Actual AppImage ELF identity and NSIS license scope — 2026-11-24

Re-read all six bundled ELF members from the historical review AppImage in artifact 14887665319, run 45318769948. Recomputed each SHA-256 (all six equal the earlier installer inventory) and inspected ELF notes and dynamic sections with readelf -n and readelf -d, without executing the binaries. Each SONAME equals its listed filename.

| Bundled library | Observed GNU Build ID | Selected declared DT_NEEDED dependencies |
| --- | --- | --- |
| libXss.so.1 | `82c0e3569eb993bf2c2e2bb8379b1564fe28eebf` | libX11.so.6, libXext.so.6 |
| libXtst.so.6 | `0403493a3501094414e75b977548928a413d8146` | libX11.so.6, libXext.so.6 |
| libappindicator.so.1 | `3952e6e8393caf73029e13d642c28e822ee50521` | libindicator.so.7, libdbusmenu-gtk.so.4, libdbusmenu-glib.so.4, libgtk-x11-2.0.so.0 |
| libgconf-2.so.4 | `ac0a2bc11dc7505e276c0327b1c1897a997ba02c` | libdbus-glib-1.so.2, libdbus-1.so.3, libgmodule-2.0.so.0 |
| libindicator.so.7 | `089a982c5c6194888bb10d378a2f29f719bcddef` | libgtk-x11-2.0.so.0, libgdk_pixbuf-2.0.so.0, libgmodule-2.0.so.0 |
| libnotify.so.4 | `bc29207f80a6b64aec329dd8397df57672ee132e` | libgdk_pixbuf-2.0.so.0, libgio-2.0.so.0, libgobject-2.0.so.0, libglib-2.0.so.0 |

These selected dynamic tags are not proof of actual runtime resolution or that dependencies are distributed inside the AppImage. A GNU Build ID is a useful lookup key for historical distribution package and debug archives, not a release version or publisher attestation. Match both full SHA-256 and package/source identity before assigning specific copyright and source availability obligations. The attempt to fetch the original appimage-12.0.1.7z release asset failed due to DNS resolution in the audit environment; no archive digest or library-to-upstream byte match was obtained. All six exact source mappings remain PENDING.

The current [official NSIS license page, revision 23142](https://nsis.sourceforge.io/mediawiki/index.php?title=License&oldid=23142) was read: general code and zlib module use zlib/libpng terms, bzip2 module uses the bzip2 license, and LZMA module uses CPL-1.0 with a special linking exception. The exception does not remove the obligations applicable to changes to the LZMA module itself. This is an upstream license-family scope lead, not version-specific proof for the historical electron-builder archives nsis-3.0.4.1.7z and nsis-resources-3.4.1.7z. The [v26 toolset documentation](https://www.electron.build/v26/docs/api/app-builder-lib.interface.toolsetconfig/) identifies these archives as the legacy split bundle. A qualified reviewer must identify actual embedded compression code and plugins, corresponding original sources/notices, and applicable obligations, separately from build-only utilities. Do not classify the complete installer as blanket MIT or zlib. No legal approval, physical-mic approval or publication authorization follows. HOLD.


### Historical toolset asset identity and six AppImage upstream Git-object matches — 2026-11-24

Read the upstream release API for each historical tool archive recorded in candidate run 45318769948. The following asset IDs and sizes were returned; the API digest field is null for all three.

| Upstream release | Asset ID | Bytes |
| --- | ---: | ---: |
| [appimage-12.0.1](https://github.com/electron-userland/electron-builder-binaries/releases/tag/appimage-12.0.1) | 13613639 | 1573447 |
| [nsis-3.0.4.1](https://github.com/electron-userland/electron-builder-binaries/releases/tag/nsis-3.0.4.1) | 16428442 | 1287512 |
| [nsis-resources-3.4.1](https://github.com/electron-userland/electron-builder-binaries/releases/tag/nsis-resources-3.4.1) | 13752602 | 730800 |

**New positive provenance evidence:** the recursive [Git tree of historical appimage-12.0.1 commit 57839c6](https://api.github.com/repos/electron-userland/electron-builder-binaries/git/trees/57839c6516289c0412c1b0887a6718d71e1ac5c2?recursive=1) is not truncated and includes all six regular x64 library blobs under `AppImage/lib/x64/`. For each previously extracted actual candidate ELF file, independently recomputed its SHA-256 (all six match the earlier table) and Git blob object ID (SHA-1 of UTF-8 header `blob <byte-length>\0` followed by exact binary bytes). Compared both size and Git object ID with that upstream immutable tree:

| Library | Actual and upstream bytes | Actual and upstream Git blob ID |
| --- | ---: | --- |
| libXss.so.1 | 14488 | `752f223df81288c87f7b8fe9f6692236b6f17088` |
| libXtst.so.6 | 22880 | `1f6fbf3e3923c203bae147fc2bfed569fbbabb55` |
| libappindicator.so.1 | 52128 | `a8c5dcaa16e6cd2ea401fae2b19dab045758b8a2` |
| libgconf-2.so.4 | 192296 | `948925c1ac5d44c046bb94ae481707da65e5eac7` |
| libindicator.so.7 | 60648 | `f36a7fb508e75655ceefb3d9ffd5749d61ca0ad3` |
| libnotify.so.4 | 31304 | `e77ed01189376ea6687e82ba30ef59cd273374a6` |

All **6/6** match the historical toolset repository at an exact Git commit. This supersedes the earlier lack of a repository-object mapping, not the missing independent release-archive SHA-256 or exact originating distribution/source-package versions. The release-asset downloads remained unavailable in this environment; raw upstream binary blob reads were rejected as non-UTF-8. Thus no independent upstream binary SHA-256 or archive hash is claimed. Git SHA-1 object identity plus matching sizes and independently measured candidate SHA-256 is useful evidence, not publisher build attestation, source-code provenance or legal approval.

Next: trace the history of these pinned library objects to the actual distribution source packages and exact versions; obtain the original copyright/license and applicable source-availability obligations, including any modifications. If archive bytes become available, independently hash them, list members without execution, compare the six x64 members against the candidate SHA-256 table, and retain the original archive identity. NSIS archive members and redistributed bootstrapper/plugin source mappings are still pending. No legal gate is approved, no model or installer is changed, and no publication is authorized. **HOLD.**


### Supplemental native notice correction merged — 2026-11-24

[PR #281](https://github.com/kunlong-luo/voxnelo/pull/281) merged into main as `d06fdf32517dfa2795332d7153b4c838bda7d835` after [CI 45324146327](https://github.com/kunlong-luo/voxnelo/actions/runs/45324146327) succeeded on synchronized head `412e4723dfeb7cfd65dbac30c44add7c5bb3f75d`. The earlier installed-DEB run 45323570903 explicitly verified all four original supplemental notice files after actual apt installation. The merged change ships Squirrel, ReactiveObjC, Mantle and Sparkle texts and checks source blob identity and packaged bytes. This is technical notice coverage remediation, not blanket third-party clearance. The old review run 45318769948 remains a pre-correction historical build: do not use its installer SHA-256 values as those of the corrected source. A fresh review-only build must record the exact new source, artifact and installer digests, inspect final installer payloads, and obtain separate physical-microphone evidence. See [release operations](RELEASE-OPERATIONS.md) and [candidate handoff](../release/V1.0.4-REVIEW-ARTIFACT-HANDOFF-2026-11-24.md). AppImage distribution-source mapping, NSIS license obligations, bundled dependencies/assets, Python runtime and model provenance remain open. **HOLD**.

## Automation boundaries and known code risk

- `scripts/check-asr-staging.mts` proves inventory/integrity, **not** lawful redistribution.
- `scripts/check-asr-real-release.mts` runs a reference WAV check when a staged manifest exists; it now requires exact boolean `releaseReady:true` when native assets are staged, and rejects absent, false, null, and nonboolean approvals. This **fail-closed technical check does not grant legal authorization**; reviewers must establish all evidence before setting approval.
- `.github/workflows/release.yml` uploads **unsigned, time-limited candidate artifacts**; successful CI does not fulfill signature, real-hardware, legal or human WER requirements.
- `pnpm asr:batch` reports private offline WAV aggregate WER/RTF; it does not measure live partial/final subtitle latency or device DSP.
- `pnpm asr:moonshine:upstream:refs` is an **opt-in**, read-only upstream reference audit. It compares version-tagged immutable text catalogs and cannot approve model rights; exit 2 for no `v0.0.65` tag, incomplete eight legacy SHA-256 catalog or unavailable upstream metadata must **not** be converted to release approval. See the [publisher evidence request](MOONSHINE-UPSTREAM-EVIDENCE-REQUEST-2026-11-23.md).

**Release owner decision: HOLD public v1.0.4 expanded native-ASR rollout pending new evidence.** The current standard installers do not bundle SDK or model weights; the user must explicitly install optional Moonshine components. Public v1.0.3 exists as a separate historical unsigned release. The private v1.0.4 Draft still targets commit `4aeb58e`, whereas `main` moved after the dependency-security fix; do not claim a fresh main build or overwrite draft/public artifacts. Keep #45/#123 open until the relevant new-engine evidence is approved. Never upload personal microphone recordings, device IDs, transcripts or private model paths to the repository.

## Current evidence and audit history

The full dated registry, convergence, score and AppImage provenance records are maintained once in [v1.0.4 registry audit and quality rubric](../release/V1.0.4-REGISTRY-AUDIT.md). Earlier duplicate sections have been removed only after exact text comparison against that canonical record. Unique evidence above is retained. Use the canonical record for exact commits, artifact IDs and observed hashes; use this document for its own scope. **HOLD; not legal or physical-device approval.**

## Native security follow-up (2026-11-25)

The [canonical audit ledger](../release/V1.0.4-REGISTRY-AUDIT.md) now documents the version-specific Ubuntu historical package archive leads and USN-8939-1 libXtst risk. Original distributor bytes remain unavailable in this review environment; do not approve older native libraries from registry audit results. An isolated toolset pilot may be considered, but require exact supported versions, final payload/source/notice mapping, actual runtime regression and fresh installer evidence before any change is published. HOLD.

## Version-specific Moonshine provenance recheck — 2026-11-25

Official source tag v0.0.65 (c09053306769543292b676c0c1e6bd55b2b6ca38) confirms English-model MIT declaration and the legacy CDN path, separately from third-party library terms. The source tree does not expose a matching eight-file checksum catalog. A third-party immutable mirror supplies 7/8 matching declared digests (six LFS pointers; one README-only), with the attention decoder missing. The official different dated model still matches only 2/8. See [publisher evidence request](MOONSHINE-UPSTREAM-EVIDENCE-REQUEST-2026-11-23.md) for exact evidence and limits. Do not promote a third-party claim to publisher approval, change pins or send the draft externally without approval. Model binaries not downloaded this round; original Wheel legal texts, native source/notice obligations, actual physical-device acceptance still pending. Latest review run 45578438677 remains unchanged. HOLD.

## Native Wheel source and notice checkpoint (2026-11-25)

The [original-Wheel provenance ledger](MOONSHINE-V1.0.4-PROVENANCE-AND-NOTICES-2026-11-23.md) records independently rehashed three report ZIPs, source merge-ref identity, seven exact upstream PortAudio binary matches and sounddevice LICENSE match. ASIO variants require separate SDK version/terms/notice review. The Moonshine fixed source LICENSE hash differs from the recorded original Wheel hashes; cause is unverified. MacOS ONNX Runtime LFS OID matches prior Wheel digest, while native source/notice scope and OpenBLAS recipe-to-binary mapping remain open. Direct PyPI DNS unavailable; no new original Wheel raw text inspection or legal approval. Preserve e35cc3a review candidate, existing pins and all human gates. HOLD.

## SDK notice identity and ASIO boundary — 2026-11-25

The [provenance ledger](MOONSHINE-V1.0.4-PROVENANCE-AND-NOTICES-2026-11-23.md#e-sdk-license-byte-reconciliation-and-asio-scope-decision--2026-11-25) reconciles all three historical Moonshine SDK LICENSE digests to the exact official Python MIT source (raw LF for Linux/macOS, reproduced CRLF for Windows). The root license is a different document. Current Steinberg GPLv3/proprietary paths and sounddevice presence-based SD_ENABLE_ASIO fallback are distinguished from the candidate's normal browser PCM -> Transcriber path. Inherited environment and actual runtime DLL loading need separate verification; optional downloaded ASIO binaries still require scope/rights review. No actual rights sign-off, model provenance closure, new original-Wheel acquisition or human trial. Latest review run 45578438677 unchanged. HOLD.

## NumPy native notice checkpoint — 2026-11-25

[Provenance section F](MOONSHINE-V1.0.4-PROVENANCE-AND-NOTICES-2026-11-23.md#f-numpy-exact-notice-reconciliation-and-remaining-native-binary-scope--2026-11-25) reconciles 57/60 recorded NumPy notice members with fixed upstream raw/CRLF hashes. Three platform root LICENSE files and native OpenBLAS/Fortran/Windows runtime terms remain unresolved. Fixed source declares additional dynamically added Wheel vendor notices beyond its source-build SPDX expression. ONNX Runtime lookup and original Wheel acquisition constraints remain; no new native binary match. Preserve e35cc3a candidate and rights/human gates. HOLD.
