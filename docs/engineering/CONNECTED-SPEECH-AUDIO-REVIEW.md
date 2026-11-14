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

## CI boundary

`tests/connected-speech-review.test.ts` verifies the export is complete, deterministic, spreadsheet-safe, and contains **no reviewer approvals or fabricated recording metadata**. `.github/workflows/ci.yml` also executes the actual native Node exporter. These checks prove software/data consistency—not linguistic, copyright or acoustic verification.
