# UI and accessibility audit — 2026-11-16

**Scope:** documentary/static review only. No rendered screenshots, screen-reader session, native device run or WCAG conformance certification was performed in this audit.

## Confirmed documentary risks

- Original [PRD F012](../Voxnelo-Product-Docs-v1.0/docs/02-产品需求PRD.md) requires keyboard access, visible focus and zoom support.
- [Historical V0.1 checklist](../release/V0.1-PRD-CHECKLIST.md) lists real-device zoom/screen-reader validation as an open gate. Synthetic Electron/browser tests are not equivalent.
- Connected speech draft examples must remain visibly distinguished from reviewed human audio; see [Issue #201](https://github.com/kunlong-luo/voxnelo/issues/201).

## Recommended manual matrix (not yet executed)

| Area | Test | Pass condition |
| --- | --- | --- |
| Keyboard | Tab, Shift+Tab, Enter, Space, Escape across navigation, practice, model management | No keyboard trap; all primary actions reachable |
| Focus | Dialog open/close, sentence change, recording permission, errors | Visible focus; return focus logically |
| Screen readers | Windows Narrator, macOS VoiceOver, Linux Orca where available | Buttons have accurate names; status changes announced without repeated noise |
| Zoom | 100%, 200%, narrow window | No clipping, hidden controls or horizontal scroll in essential workflow |
| Motion | OS reduced-motion and in-app preference | Nonessential animation reduced; no information loss |
| Contrast | Nordic/Sunset themes, light/dark, hover/focus/disabled | Text and controls legible; verify contrast with tooling |
| Audio status | TTS vs human recording, unavailable/error, careful/natural modes | Source and review status never misrepresented |
| Streaming | Partial/final transcript, long sessions, scroll, errors | Newest text visible, no stale subtitle or infinite accumulation |
| Three OS | Windows/macOS/Linux on physical hardware | Record results separately; no cross-platform inference |

## Follow-up

Capture redacted screenshots and issue links for each confirmed defect. Map component names, relevant tests and severity after a source-level UI inventory. Do not report these proposed checks as completed.

## Follow-up on 2026-11-23 — new V3 source-level UI evidence (NOT physical acceptance)

A [new dictation-first V3 design and QA spec](../design/V3-DICTATION-FIRST-UX-2026-11-23.md) addresses two code-observed usability risks: the former live ASR microphone was a small icon-only action competing with a similarly prominent recorder, and unavailable-model recovery/help was hidden at small window heights. The source iteration now exposes a **text-labeled live start/stop action**, actual interim/latest-final text, a distinct **record/replay** name and subdued control, and always-visible model recovery access. Tests in [`tests/live-dictation-v3.test.tsx`](../../tests/live-dictation-v3.test.tsx) confirm semantic states and interaction in JSDOM; the [existing UI test](../../tests/i18n-and-tooltips.test.tsx) confirms the new recorder accessible name.

**Not yet verified here:** rendered 320×640 / 390×844 / 640×720 / 800×610 / 1160×760 / 1440×900 physical UI, actual light/dark contrast compositing, 200% zoom, Narrator/VoiceOver/Orca speech verbosity, OS-native capture prompts and full physical microphone behavior. Browser / virtual Electron CI may add geometry evidence, but it is not a qualified human physical-device review. **Do not replace the 2026-11-16 historical assessment or mark F012 as fully accepted.**
