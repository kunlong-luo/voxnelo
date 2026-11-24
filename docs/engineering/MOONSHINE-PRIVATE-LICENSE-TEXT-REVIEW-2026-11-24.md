# Moonshine v1.0.4 — private review of exact Wheel LICENSE/NOTICE bytes

**Status: HANDOFF TOOL AVAILABLE; ORIGINAL LEGAL TEXTS NOT YET REVIEWED; v1.0.4 HOLD.** This is a manual reviewer workflow, not a legal opinion, redistribution permission, publisher build attestation or a claim about real microphones. The old v1.0.4 Draft Release ID 428750217 remains unpublished with eight earlier artifacts. Public latest remains v1.0.3.

## Why this handoff exists

The [three-platform original-Wheel audit](MOONSHINE-V1.0.4-PROVENANCE-AND-NOTICES-2026-11-23.md) verified pinned Python 3.12 ZIP digests, package-specific dist-info identity and presence of **30/31/30 declared license-file paths** (Linux/Windows/macOS), with zero missing declarations. It recorded names and SHA-256 of **33/34/33 indexed legal/NOTICE ZIP entries**, **not the actual text** of those entries or obligations of embedded native components. File presence alone cannot establish lawful redistribution or required attribution.

The opt-in, local-only [review exporter](../../scripts/prepare-moonshine-private-license-review.py) lets a human examine the **exact original bytes** without copying texts or private filesystem paths into a public CI artifact, PR or issue. The exporter never downloads Wheels, loads native libraries, contacts a publisher, accesses microphones, or modifies Release assets. The explicit earlier download and PyPI digest audit below **do** contact PyPI.

## Reproduce privately on each intended OS

Use Python **3.12** and the candidate source revision. Run independently on Linux x64, Windows x64 and macOS 15+ Apple Silicon as applicable, because the pinned Wheel sets differ. The commands below illustrate a POSIX shell; on Windows use a private PowerShell folder and py -3.12 instead of python3.12. Keep output paths **outside the Git checkout**, outside publicly synced folders, and do not upload ZIP bytes or raw license text.

~~~bash
# Choose an existing private parent outside the Git checkout.
mkdir -p "$HOME/voxnelo-private-rights-review/wheelhouse"
WHEELHOUSE="$HOME/voxnelo-private-rights-review/wheelhouse"
REPORT="$HOME/voxnelo-private-rights-review/registry-digests.json"
OUTPUT="$HOME/voxnelo-private-rights-review/legal-text-review"

# Network-dependent, user-initiated exact version-pinned Wheel download.
python3.12 -m pip download --isolated --disable-pip-version-check \
  --no-input --no-cache-dir --only-binary=:all: \
  --index-url https://pypi.org/simple \
  --constraint scripts/moonshine-python-constraints.txt \
  --dest "$WHEELHOUSE" "moonshine-voice==0.0.65"

# Network-dependent PyPI published-hash check; fail on hash or package-set drift.
# REPORT must not exist yet. This is NOT a legal-approval report.
python3.12 scripts/audit-moonshine-wheelhouse.py \
  "$WHEELHOUSE" scripts/moonshine-python-constraints.txt "$REPORT" \
  docs/engineering/moonshine-python312-wheel-digests-2026-11-23.json

# OFFLINE local-only text export. OUTPUT must be a NEW, ABSOLUTE path.
python3.12 scripts/prepare-moonshine-private-license-review.py \
  "$WHEELHOUSE" "$REPORT" \
  docs/engineering/moonshine-python312-wheel-digests-2026-11-23.json \
  "$OUTPUT"
~~~

Do **not** reuse an already populated Wheel directory or report from another platform; the audit rejects extra/missing Wheels and hashes. Do not alter constraints or pinned SHA-256 values to force success. If a command fails, evidence remains **PENDING**.

## Contents of the private output

- **REVIEW-INDEX.json** — per-package version, original Wheel filename and pinned SHA-256, license expression/classifiers, declared license files, native-library **names and hashes only**, and exact local text references. Every reviewer status remains PENDING; licenseApproved, noticeObligationsApproved, modelRightsApproved and releaseApproved are **always false**.
- **raw-text/0001.raw**, etc. — original bytes for every indexed LICENSE/NOTICE member and each Wheel's core METADATA, including original archive member name, byte SHA-256 and text-file reference in the index. These are numbered rather than using untrusted archive paths. No native executable or model weight is exported.
- No original legal text, preview, private absolute path or identifying user data is printed to stdout, uploaded by CI or committed by this tool. On POSIX, new directory/file modes are restrictive (0700/0600). On Windows, POSIX file modes **do not guarantee restrictive Windows ACLs**; choose a suitably access-controlled private folder. On all platforms, use a **canonical physical path without symbolic links or Windows directory junctions in any ancestor** (for example, avoid macOS `/var` or `/tmp` aliases); the exporter now refuses symlinked path ancestors rather than following them silently. It does not detect cloud-sync or publicly shared folders; verify the chosen location before proceeding.

The exporter checks the original Wheels against the **committed per-platform Python 3.12 digest snapshot**, rescans the original ZIP and checks each exported member's bytes. The scanner now records the exact core `METADATA` **SHA-256**, and the exporter compares the **exported METADATA bytes** with that independently scanned digest; it also rehashes the **whole Wheel after export** to detect changes during review preparation, including unexported binary members. It rejects missing declared license files, mismatched package metadata, changed source bytes, altered manifests, existing output folders, or destinations under the Git checkout. The entire existing output path ancestry is checked for symbolic links and Windows junctions, not only the immediate parent, reducing the chance of silently redirecting private text through an alias. **These checks are best-effort file-integrity safeguards, not protection against an actively hostile process concurrently replacing or redirecting files**; use a trusted, access-controlled local directory. A PyPI-published checksum is **not a cryptographic publisher build attestation**; the original report and tested source SHA still require human source review. The exporter does not replace a final Electron/npm SBOM or a model provenance audit.

## Human review still required

| Scope | Specific reviewer action | Status |
| --- | --- | --- |
| Moonshine Voice 0.0.65 | Read exact Wheel LICENSE, core METADATA and versioned source terms; record attribution and opt-in distribution scope | **PENDING** |
| ONNX Runtime and native Moonshine libraries | Trace embedded platform-native binaries to source/version and dynamic/static dependencies; check notices | **PENDING** |
| NumPy, OpenBLAS and bundled third parties | Read all original LICENSE/NOTICE subtexts and record any accompanying attribution | **PENDING** |
| PortAudio / sounddevice | Check packaged Windows/macOS binaries and separate Linux system-library licensing | **PENDING** |
| Other pinned Python Wheels | Inspect each exact original Wheel (13/14/13 package decisions; Windows-only colorama included) | **PENDING** |
| Final Electron/npm desktop installers | Review a **separate** bundled-component inventory/SBOM and mandatory notices, tied to installer hashes | **PENDING** |
| Eight historical English model files | Obtain an authoritative **publisher-authored immutable SHA-256** catalog and version-specific license; see [unsent request](MOONSHINE-UPSTREAM-EVIDENCE-REQUEST-2026-11-23.md) | **PENDING; only 2/8 match a different dated model** |
| Real human microphones / privacy | Review separately collected, consented per-device human-microphone records and visible subtitle latency; see [ledger](../release/V1.0.4-PHYSICAL-DEVICE-EVIDENCE.md) | **PENDING** |

Retain each reviewed source URL/revision, exact artifact SHA, text hash, reviewer/date, obligations, result and rationale privately. A generated index cannot make a legal or release decision. Do not send private source files or review records to public issues/PRs. Existing unsigned-install permission does **not** waive software rights, privacy or microphone acceptance.

**Publication remains HOLD.** Frozen original product documentation is not modified.
