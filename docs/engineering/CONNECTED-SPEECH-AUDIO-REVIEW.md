# Connected-speech language review & legal audio handoff

## Current status (2026-11-14)

- The 40 starter phrases have editorial US reference IPA. **Ten** have example connected-speech IPA; one phrase has two separate rules, making **11 rule rows**. All ten remain **`editorial-draft`**, not linguistically approved.
- The listen controls use **system TTS**, with a device-dependent browser English voice and Linux eSpeak fallback. They do not replay validated human recordings or guarantee their phonemes match the illustrative connected IPA.
- No licensed reference-audio recordings exist in this repository. No recording may be described as reviewed merely because a CI build or model benchmark passes.
- The v1.0.4 private Draft installer predates these changes; it remains unpublished.

## Export evidence packet without uploading or recording speech

Run from the repository root:

```sh
pnpm --silent content:review:export > connected-speech-review.csv
```

The exporter runs **entirely offline**, creates no application state, and writes a UTF-8-BOM CSV for Chinese and IPA. It contains one row per rule with sentence ID, full text, existing reference IPA, illustrative connected IPA, rule kind/span, and Chinese and English explanations. `review_decision` is **PENDING** for every row; reviewer/date, pronunciation source, audio ID, redistribution rights, SHA-256, and alignment evidence are blank by design. These are placeholders, **not assertions of approval**. The CSV is a temporary review handoff, not an automatic app-import format. Do not commit recordings or filled sheets containing personal information without appropriate review.

The export also includes blank `review_notes` for the reviewer's proposed changes. After a qualified expert fills the *external* sheet, the maintainer can run:

```sh
pnpm content:review:check connected-speech-review.csv
# or, to self-check the clean exported template without saving it:
pnpm --silent content:review:export | pnpm content:review:check -
```

This read-only, offline checker verifies every expected rule, unchanged editorial content, allowed decisions (`PENDING`, `ACCEPT`, `REVISE`, `REJECT`), review identity/date/reference fields for decisions, and the shape of any single-recording rights/hash/alignment evidence. It reports missing correction notes for revisions/rejections. It **never imports approvals, asserts reviewer identity, checks that a source is authoritative, verifies redistribution rights or authenticates audio**. Do not commit completed sheets with personal data. A syntactically valid `ACCEPT` is still an unverified external claim. The existing single-audio columns are not a two-take manifest; careful and natural recordings require their own independently reviewed asset records before playback can be shipped.

## Acceptance procedure

1. Have a qualified US-English phonetics reviewer compare **every word and rule** to the supplied spelling, intended stress, supported accent, normal/slow pronunciation, and coherent connected IPA; document conflicting common realizations rather than imposing a single mandatory variant.
2. Record reviewer identity and date in the external review sheet, decision (accept/revise/reject), supporting dictionaries or references, and specific corrections. The maintainer must review and incorporate changes via ordinary PR with tests, not by silently changing `reviewStatus`. A CSV alone is not enough to certify results.
3. Before including **any** new reference recording in the app, retain explicit permission or a license allowing application redistribution, provider/performer and recording provenance, speech variant (careful versus casual), language and accent, file SHA-256 and immutable asset identifier, and written confirmation that the *actual audio* matches the displayed phonetic annotation. Document attributions and terms for updates.
4. Include a playback test for that real asset: offline after install, no network call, no autoplay, cancellation on sentence change/recording, speed behavior (time-stretch should not be misrepresented as a second recorded take), missing-asset fallback, and Windows/macOS/Linux packaging. Inspect pronunciation and intelligibility with physical speakers/headphones.
5. Only then propose an ADR that supersedes `docs/ADR/ADR-0001-reference-audio.md`; add the vetted asset manifest and explicit source selection. Until completed, keep current system-TTS source labels and do not introduce a second “natural reference audio” button.

## Two-take WAV intake preflight (engineering only; no new playback yet)

The repository now has `assets/audio/reviewed-manifest.json` with **zero pairs**. It has no recorded audio and does not add audio to Electron packages or public Pages. The manifest remains empty until human phonetics and legal review are independently documented.

To inspect this empty, fail-closed baseline, run:

```sh
pnpm content:audio:verify
```

For future *separately recorded* careful and natural US-English takes, a maintainer should only propose a populated manifest after real review, permission and aligned recordings exist. Each pair must match the canonical sentence ID, English text, standard IPA and connected IPA. Provide a private linguistics review evidence reference, review date, and **two** distinct WAV PCM16 mono files under `assets/audio/reviewed/`. Every take needs its own immutable `assetId`, filename, SHA-256, sample rate, duration, performer evidence ID, license reference, redistribution-rights evidence reference, attribution and actual-audio-to-IPA alignment evidence ID. Naming is `s008-careful-v1.wav` / `s008-natural-v1.wav`, with corresponding asset IDs.

The offline preflight rejects unsafe filenames, missing or symlinked files, reused SHA-256, malformed RIFF/PCM format, inconsistent duration/rate and incomplete metadata. It additionally **rejects any populated pair while the matching curriculum's review status is still `editorial-draft`**. A metadata entry is not permission to change that status. SHA-256 only proves that bytes match a claimed digest; it does not prove the speaker, correctness, recording independence, licence authenticity or redistribution right. Authenticity, license scope, phonetic alignment, physical audio listening tests and release readiness remain **human-maintainer gates**.

The automated tests use temporary **synthetic test data**, never included in an installer or advertised as speech. The preflight alone never imports a review sheet, approves any asset, enables a natural-audio button, changes ADR-0001, modifies packaging or publishes a release. Once external sign-off exists, a separate PR must deliberately connect trusted assets, source selection, cancellation and platform delivery with a full human and CI review.


## 20-take recording worksheet (private, entirely unapproved)

The rule-by-rule pronunciation CSV contains **11 rule rows**, but making the
two distinct recordings requires **20 audio takes** (two for each of the ten
connected-speech phrases). Export the separate, deterministic recording
handoff sheet entirely offline:

```sh
pnpm --silent content:audio:handoff:export > audio-handoff.csv
```

The worksheet names each sentence and its intended **careful** (standard IPA)
and **natural** (illustrative connected IPA) version, plus proposed distinct
asset IDs and WAV filenames. These are **suggested names only**, not proof
that recordings exist. All human-review, performer, licence, redistribution
permission, attribution, audio-to-IPA review, hash and correction-note fields
are intentionally blank; all 20 decisions are `PENDING`. The connected IPA
is still editorial draft: reviewers must first validate the intended pronunciation.

Keep the completed `audio-handoff.csv` and linguistic review sheets in an
approved **private** review channel. They may contain personal details,
voice identities, contractual records and protected source material.
`.gitignore` prevents ordinary accidental commits of these root-level CSVs
and all `assets/audio/reviewed/` takes; force-adding any licensed recordings
requires a deliberate, separately reviewed PR. Never force-add private
permission records or performer contact information.

An **empty** `reviewed-manifest.json` now rejects an unexpected WAV, an
unlisted reviewer spreadsheet, a subdirectory, or a symlink appearing in
`assets/audio/reviewed/`—even before any audio pairing is enabled.
A populated manifest must list every installed direct-child file and still
pass the existing independent rights/phonetic status gates. CI/preflight
does not authenticate evidence or perform human sign-off.

## Offline reference playback groundwork (not yet a shipped second source)

The `packages/audio/offlineWav.ts` module now contains a **local-bytes-only** audio player, not a URL fetcher, content-approval system or audio acquisition workflow. It independently verifies a bounded mono PCM16 RIFF/WAVE file and its real SHA-256 **before** creating an audio object URL. Playback is cancelled and its object URL revoked on stop, sentence changes, starting recording, starting dictation, another TTS request, or a different WAV. If a checksum is incorrect, the browser lacks Web Crypto, the WAV is malformed or the audio device fails, playback is refused and a real error is returned; no success is fabricated. The slow setting changes the same take's playback speed and **does not** constitute a separate careful recording.

The `speakLessonReference` learning-service contract records both the requested source and the source actually played. Since every guide is still unreviewed and `assets/audio/reviewed-manifest.json` is empty, **all existing UI speaker buttons continue to request and label system TTS**, and requests for `careful` or `natural` return system TTS with `unavailableReason: 'review-pending'`. No real assets are discoverable or playable through that route. This is a truthful fallback, not a new natural-audio button.

The low-level WAV helper accepts bytes handed to it by a caller; the checksum and PCM format alone **do not authenticate recording provenance, phonetics or copyright**. It must not be connected to a renderer/desktop asset loader until a separate, independent human sign-off has produced a rights-cleared curriculum+manifest and packaging validation for actual recordings. Do not allow a caller to claim `linguist-reviewed` by merely editing JSON. Existing ADR-0001 remains in force.


## One PCM/WAV format policy in browser and offline intake

`packages/audio/pcmWav.ts` is the **single** shared pure-byte parser used by both
`scripts/reviewed-audio-validator.mts` and the future local WAV player
`packages/audio/offlineWav.ts`. Both accept only bounded RIFF/WAVE mono
PCM16 audio at 16–48 kHz and 150–15000 ms, with exactly one valid `fmt `
and one nonempty `data` chunk, valid chunk boundaries, and no disguised
compressed/stereo data. WAV metadata chunks (including correctly padded odd
sizes) can be present without altering the PCM acceptance policy.
The manifest preflight additionally checks the declared sample rate and
duration against the bytes, while actual playback always checks SHA-256
before creating any audio object URL.

`tests/shared-pcm-wav-gate.test.ts` compares the browser and Node entry
points against the same synthetic byte fixtures; no genuine reference
recordings are shipped as tests. This prevents future format-policy drift
but is **not** proof of recording quality, IPA accuracy, performer identity,
rights, or permission to expose the careful/natural playback controls.
The reviewed manifest stays empty and the current app plays labeled system TTS.


## CI boundary

`tests/connected-speech-review.test.ts` verifies the export is complete, deterministic, spreadsheet-safe, and contains **no reviewer approvals or fabricated recording metadata**. `.github/workflows/ci.yml` also executes the actual native Node exporter. These checks prove software/data consistency—not linguistic, copyright or acoustic verification.
