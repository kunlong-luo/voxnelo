# PRD → implementation → test traceability

Snapshot: 2026-11-16; initial documentary cross-reference, **not** a source-level exhaustive verification or sign-off. Original frozen requirement: [PRD](../Voxnelo-Product-Docs-v1.0/docs/02-产品需求PRD.md). Historical evidence: [V0.1 checklist](V0.1-PRD-CHECKLIST.md). Status vocabulary: **documented implementation** = previously recorded in the historical checklist; **requires verification** = no fresh source/test mapping established in this audit; **external gate** = human or hardware proof outstanding. Do not convert a historical statement into new acceptance.

| PRD ID | Requirement | Recorded implementation evidence | Test / acceptance evidence to collect | Status |
| --- | --- | --- | --- | --- |
| F001 | Chinese-first entry, no login | Historical V0.1 checklist: React entry | Fresh install, locale and keyboard smoke | Documented; reverify |
| F002 | Sentence card, translation, IPA | Historical checklist: 40 phrases | Long text, translation/IPA editorial review | External content gate |
| F003 | Normal/slow reference audio | System TTS; see ADR-0001 and connected speech review | Offline playback, voice availability, audio provenance | External audio gate |
| F004 | Permissioned record and replay | Historical checklist: MediaRecorder | Physical mic, deny/retry, device removal | Hardware gate |
| F005 | Change sentence safely | Historical checklist: navigation and cancellation | No stale sound or old recording | Reverify |
| F006 | History | Historical checklist: IndexedDB view/practice events | Restart and invalid-event recovery | Reverify |
| F007 | Favorites | Historical checklist: Dexie | Restart persistence | Reverify |
| F008 | Review markers | Historical checklist: manual flags | Distinguish manual review from pronunciation scoring | Reverify |
| F009 | Local storage | Historical checklist: Dexie | Offline, schema migration, failed storage | Reverify |
| F010 | 30–50 vetted phrases | Historical checklist: 40 phrases | Independent content and license audit | External content gate |
| F011 | Permissions and security | Historical checklist: isolated Electron/preload | Platform privacy and permission checks | Reverify |
| F012 | Accessibility | Historical checklist: keyboard/focus/reduced motion | Physical keyboard, zoom, screen reader | Hardware gate |
| F101–F104 | Guidance, segment playback, help, spaced review | Original PRD v0.2 scope | Map each to current component and test | Requires verification |
| F105–F108 | Recommendation, search, backup, 100–200 phrases | Original PRD v0.3 scope | Map each to current component and test | Requires verification |
| S001 | SpeakFeed | Original v1.0 plan | Gesture tests and real trackpad/keyboard acceptance | Requires verification |
| S002 | Speak Karaoke | Original v1.0 plan | Live word alignment, partial-utterance non-green tests | Requires verification |
| S003 | Smart Prompt | Original v1.0 plan | Pause, disable, false-trigger and interruption tests | Requires verification |

## Scope changes and gaps

- The original V0.1 excluded ASR. Subsequent Moonshine work is a scope addition; do not rewrite the frozen PRD to imply it was required in V0.1.
- `package.json` version `1.0.4` is a source/package identifier, **not** proof of a published v1.0.4 Release.
- Connected speech: 10 editorial phrases, 11 rules, 20 proposed independent takes. Expert review, rights, and actual audio acceptance remain pending: [Issue #201](https://github.com/kunlong-luo/voxnelo/issues/201).
- Full traceability requires a subsequent source/test symbol inventory and manual hardware evidence. This table deliberately avoids invented test paths and sign-offs.
