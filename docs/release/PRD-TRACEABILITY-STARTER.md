# PRD → implementation → tests: historical starter (superseded)

> **Historical:** Superseded by the [current 23-ID PRD → code → test matrix](PRD-TRACEABILITY.md). The earlier “not independently mapped” cells below were an initial audit snapshot, not the current repository assessment. Preserve for provenance; edit the current matrix instead.

Baseline: docs/Voxnelo-Product-Docs-v1.0/docs/02-产品需求PRD.md. Original Word/PDF are frozen. This is a starter, not a completed code-symbol audit. Prior checklist: V0.1-PRD-CHECKLIST.md.

| ID | Requirement | Implementation evidence to inspect | Automated test evidence | Human acceptance |
| --- | --- | --- | --- | --- |
| F001 | First-run / no account / language | React app bootstrap, preferences | Not independently mapped | Not independently verified |
| F002 | Sentence / translation / IPA / difficulty | packages/content/sentences.ts, practice UI | Not independently mapped | Linguistic review outstanding |
| F003 | Normal and slow reference playback | System TTS learning service | Not independently mapped | Licensed human audio not approved |
| F004 | Microphone recording / playback | Electron permission boundary, MediaRecorder | Not independently mapped | Real-device test evidence to link |
| F005 | Switch sentences | Practice navigation, playback cancellation | Not independently mapped | Real-device test evidence to link |
| F006 | History / restart | Dexie history | Not independently mapped | Persistence test evidence to link |
| F007 | Favorites | Dexie favorites | Not independently mapped | Persistence test evidence to link |
| F008 | Review flags | Local review state | Not independently mapped | User validation to link |
| F009 | IndexedDB | Dexie schema and migrations | Not independently mapped | Upgrade test evidence to link |
| F010 | 30–50 sentences | packages/content/sentences.ts (README claims 40) | Not independently mapped | Content rights and IPA review outstanding |
| F011 | Security and privacy | Electron isolation, docs/PRIVACY.md | Not independently mapped | Independent privacy review to link |
| F012 | Accessibility | Practice UI and preferences | Not independently mapped | Keyboard / reader / zoom hardware validation to link |

Status must distinguish: source inspected, automated test executed, real-device verified, and externally reviewed. Do not convert unknown evidence into PASS. Additional product-roadmap features (SpeakFeed, Speak Karaoke, Smart Prompt) are separate future scope and not implied by source version 1.0.4.
