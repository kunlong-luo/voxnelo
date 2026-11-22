# Voxnelo v1.0.4 — Moonshine 0.0.65 English Streaming license evidence

**Reviewed against public upstream declarations: 2026-11-12.**
**Decision: PARTIAL EVIDENCE ONLY — not a release approval or legal opinion.**

## Exact integration under review

- Voxnelo invokes an **opt-in**, isolated local Python environment and pins `moonshine-voice==0.0.65`. The standard Linux x64 / Windows x64 / macOS 15+ ARM64 installers do **not** bundle the Python SDK, wheels or Moonshine model weights. User interaction is required before installing them.
- The English Medium Streaming **quantized** model is verified against the eight immutable file SHA-256 values in [moonshineIntegrity.ts](../../apps/desktop/moonshineIntegrity.ts); hashes establish local byte equality, not copyright provenance or third-party license compatibility.
- The user-initiated installer uses [install-moonshine-linux.mts](../../scripts/install-moonshine-linux.mts) to obtain the pinned SDK from PyPI and model from the Moonshine downloader/CDN. A separate private CI job exercises the real native runtime, PCM and packaged Electron Worker. This is not a measurement of microphone-to-subtitle latency or speech recognition accuracy.
- Because v1.0.4 installers include code that **facilitates downloading** external components, their separate licenses and provider terms must be assessed even though weights and wheels are not bundled with the Voxnelo installer.

## Upstream public license statements (source URLs, not verification of every dependency)

| Scope | Source | Observed claim | Status for Voxnelo |
| --- | --- | --- | --- |
| Pinned Python package | [PyPI moonshine-voice 0.0.65](https://pypi.org/project/moonshine-voice/0.0.65/) | License metadata MIT; page states code and English-language models MIT | **Source claim recorded**, not independently audited wheel binary or transitive licenses |
| Moonshine source | [Official upstream LICENSE](https://github.com/moonshine-ai/moonshine/blob/main/LICENSE) and [license guidance](https://github.com/moonshine-ai/moonshine/blob/main/docs/license.md) | MIT by default for Moonshine STT code/English streaming models; explicit exceptions for legacy non-English non-streaming models; `core/third-party` follows its own third-party licenses | **Source claim recorded**; `main` can change and is not a version-specific audit |
| English Medium Streaming | [Official model inventory](https://github.com/moonshine-ai/moonshine/blob/main/docs/models/available-models.md) | English Medium Streaming is marked MIT | **Model family license identified**, exact downloaded quantized file notices/manifest still to verify |
| Downloaded model asset provenance | [Official model downloader](https://moonshine-voice.readthedocs.io/en/stable/using/downloading-models/) and [upstream assets mirror](https://moonshine-voice.readthedocs.io/en/stable/models/huggingface/) | Downloader uses Moonshine CDN/cache; mirror describes release tags and `FILES.tsv` checksums | **Need map pinned 0.0.65 catalog & eight local digests to immutable upstream asset snapshot** |

Important distinction: the upstream **MIT** statement for the English ASR model is not a blanket license statement for all Python package dependencies, OS-native linked libraries, TTS components or user-provided content. The separate Moonshine Community License applies to *specified legacy non-English models*, not to the documented English Medium Streaming STT model.

## 2026-11-22 registry-file checksum inventory (source-side only)

The exact v0.0.65 files and **published PyPI digest values** below were read from [PyPI's fixed-version release file table](https://pypi.org/project/moonshine-voice/0.0.65/) on 2026-11-22:

| Target | Distribution filename | PyPI SHA-256 |
| --- | --- | --- |
| Windows x64 | `moonshine_voice-0.0.65-py3-none-win_amd64.whl` | `657e16825ca8f4298fea2a9d9a28bb685d9cf6ad247e104656ed5b02b9ff886b` |
| Linux x64 | `moonshine_voice-0.0.65-py3-none-manylinux_2_34_x86_64.whl` | `946e0a056dd3a13ee8cc28dec84c0f01676743a841bae5e6c52a87483b10241b` |
| macOS 15+ ARM64 | `moonshine_voice-0.0.65-py3-none-macosx_15_0_arm64.whl` | `3e92fa8497bf4fc40b6241e4dc29fd4ac77832f7f3d8addc4fd467a6bf1cf605` |

**Precisely what has been verified:** the publisher-facing package listing supplies these filenames, platform tags and digests and declares Moonshine SDK / English language models MIT. This review has **not downloaded and rehashed these wheels, unpacked their METADATA/LICENSE/third-party notices, scanned bundled native libraries, or traced every installed dependency**. PyPI's v0.0.65 release page explicitly reports **no provenance attestations** for its release files; a registry SHA is not a trusted build attestation or a legal opinion.

**Confirmed implementation gap:** [`install-moonshine-linux.mts`](../../scripts/install-moonshine-linux.mts) installs `moonshine-voice==0.0.65` from PyPI with binary-only mode, but does **not** enforce the registry wheel hashes via `--require-hashes` or a per-platform hash-pinned requirements file. Its transitive Python dependencies are not individually locked by that command. The model's eight post-download hashes in `moonshineIntegrity.ts` are a different check and must not be represented as proof of SDK-wheel integrity, provenance or licensing. Keep the runtime opt-in while evaluating a platform-specific resolved, hash-pinned installation plan.

**Next audit deliverables (not yet done):** download and rehash all **three** relevant platform wheels; inspect archive notices/METADATA and linked libraries; resolve the exact installed Python dependency inventory/license obligations on each target OS; generate a lockfile-based production Electron/npm license and notices inventory for the eventual shipped installer; match the eight quantized model digests to an **immutable upstream snapshot**, including the applicable asset license/attribution and CDN terms. Do not extrapolate from today's upstream `main` to the v0.0.65 binaries. See the [direct-human microphone evidence ledger](../release/V1.0.4-PHYSICAL-DEVICE-EVIDENCE.md), which is a separate release blocker.

## Release evidence still required

1. **Pinned binary provenance.** Record the exact PyPI v0.0.65 Windows x64, Linux x64 and macOS ARM64 wheel filenames and SHA-256, inspect the wheel `METADATA`, `LICENSE`/notices, and confirm native libraries and any other redistributable parts against their respective permissions.
2. **Model-file provenance.** Match the eight pinned quantized model-file hashes against a specifically dated/versioned authoritative upstream catalog or tag. Record any redistribution/attribution or external CDN conditions.
3. **Dependency license inventory.** Review the actual v0.0.65 installed wheel and native/transitive dependencies for each OS, including license notices. A vulnerability scan or successful import is not a license audit.
4. **User-facing transparency.** Keep SDK/model opt-in, download origin, offline-after-install behavior, required OS versions, permission handling and unsigned-install warnings precise. Document attribution if legally required; no third-party weights or private audio in GitHub.
5. **Physical-device & product acceptance.** For the **new Windows/macOS native engines**, collect appropriately consented private real microphone metrics, WER/latency, denial/disconnect/continuous-use, upgrade preservation and F001–F012 evidence. Prior owner-approved old-version tests do not automatically establish these metrics.

No user audio, identifiable transcripts, private personal paths or device IDs should be posted to public Issues or PRs. Track evidence status in [Issue #45](https://github.com/kunlong-luo/voxnelo/issues/45) and [Issue #123](https://github.com/kunlong-luo/voxnelo/issues/123); record only nonidentifying aggregate results with the tested artifact SHA.

## Exact release state and unsigned decision

The [private v1.0.4 Draft](https://github.com/kunlong-luo/voxnelo/releases/tag/untagged-8e53c1681c97fa425813) contains the eight preverified assets built from commit `4aeb58e37840d2aec760fac3e348ab18b9ce1be1`. As of 2026-11-12, its state is `draft=true` and `published_at=null`. Public latest is still v1.0.3. **Never relabel the Draft as built from a later `main` commit.**

The owner chose **unsigned** releases with explicit Windows SmartScreen/macOS Gatekeeper/Apple notarization warnings. Signing/notarization is optional, but the choice does not waive functional, rights or privacy review. The draft is not approved for public publication merely because all native CI and SHA-256 checks passed. The 2026-11-09 full pnpm security audit failed on the dev-only `wait-on` chain; [PR #192](https://github.com/kunlong-luo/voxnelo/pull/192) removed that dependency and **seven PR checks passed** on 2026-11-12, then merged to newer `main`. This security fix does not retroactively alter the older private Draft binary or its source commit.
