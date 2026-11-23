# Voxnelo V3 — Dictation-first practice workbench (2026-11-23)

**Status:** code-level implementation for a future/unpublished source candidate; **not** a declaration of Windows/macOS/Linux physical-window or microphone acceptance. The original v1.0 PRD under \`docs/Voxnelo-Product-Docs-v1.0/\` is frozen. This is a **visual-information hierarchy iteration**, not a replacement of on-device ASR, release permissions, lesson content or recorded-learning state.

## Product decision: one unmistakable primary audio action

Voxnelo is a live-English-dictation-first learning product. The visual hierarchy is:

1. **English learning sentence**, Chinese translation and reviewed/qualified pronunciation guidance — main content, not a decorative dashboard.
2. **Live English dictation — primary action.** A visible, labeled button says "开始实时听写 / Start live dictation" or "停止听写 / Stop dictation". This is the live microphone action, not an audio recording button. Its state and the current/latest recognized English sit together inside a single stable, high-contrast surface.
3. **System TTS, slower playback and record/replay — secondary controls.** "录制回听 / Record & replay" is a distinct, quieter outline-style operation. Recording and local playback continue to work when native ASR is unavailable; no existing keyboard or permission behavior is removed.
4. **Auxiliary insights**, course tips, related phrases and activity history remain visually subordinate to the sentence and live action; statistics come only from local real data.

This is deliberately **Warm Nordic Focus** rather than a third theme. It reuses the existing \`sunset\`/ \`nordic\` semantic tokens and Tailwind 4 + Base UI. No new styling library, large animation runtime, native tooltip or standalone page CSS was introduced. The \`practiceCard\` remains the single main glass surface; the live region uses an opaque-enough \`bg-card/90\` sub-surface instead of a second heavy backdrop-filter blur.

## External design references — principles, not copied screens

| Official reference | What Voxnelo adapts | What Voxnelo explicitly does not copy |
| --- | --- | --- |
| [Mobbin](https://mobbin.com/) — production UI patterns, screens and flows | Task-first placement, understandable primary actions, clear empty/loading/error/ready states | Proprietary screenshots, component markup or illustrations |
| [Refero](https://refero.design/) — shipped product interfaces and navigation/interaction patterns | Small-area hierarchy, readable state text and deliberate secondary paths | Other brands' visual assets or unverified productivity claims |
| [Linear's 2026 UI refresh](https://linear.app/now/behind-the-latest-design-refresh) | Less competing chrome, calmer secondary buttons, consistent control size and contrast | Linear's branded dark theme or its whole sidebar layout |
| [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) | Visible keyboard focus, preserved controls at zoom, meaningful names and states, readable text | Claiming WCAG conformance without rendered checks and assistive-technology validation |

Source code is the implementation truth; reference websites are **design research**, not a license to paste their interfaces.

## Implemented interaction and semantic state contract

| Real state | Label and visual behavior | Safety/accessibility boundary |
| --- | --- | --- |
| Idle + local recognizer available | Live action displays "Start live dictation" (not an icon-only mic) and a concise current-mode notice; empty transcript hint appears on ordinary-height screens | Never starts without an explicit click; manual TTS/recording remains separate |
| Checking or actively listening | The same primary action becomes the visible **Stop dictation** button and stays enabled even when another recording-start guard is in effect | Keep true \`dictation.status\` as the only state source; \`aria-pressed\`, spoken status and readable stop label do not depend on animated rings |
| Listening + actual audio input-level data | Small input indicator renders only for actual \`dictation.inputLevel !== null\`; \`role=img\` uses localized aria-label | Indicator represents measured input level, **not** pronunciation score, synthetic VAD, audio quality or noise-filter guarantee |
| Interim and final transcripts | Current interim phrase takes priority; recent-final fallback is bounded to 18 words, displayed at readable 14–16px. Complete final text remains behind an explicit **History** button in a scrollable region | Do not continuously accumulate an unreadable paragraph in the live viewport or lose actual completed content |
| Offline engine/model missing or corrupt | Clear unavailable message plus **Manage offline models** and help link. Model recovery actions must **not be hidden by short-window height CSS** | Installed model safety still determined by existing checksum/runtime guard; no automatic download or cloud fallback |
| Browser online mode explicitly selected | State visibly warns that browser recognition **may upload audio**, and a separate control returns to local mode | Online browser recognition is never enabled automatically or in Electron; changing visual prominence must not blur the privacy boundary |
| Recorder requesting/recording/replay | Visually subordinate outline-style "Record & replay"; true record/stop/playback states and messages stay intact | Keep real recording permission and session data logic; prevent competing live/recording sessions via existing guard |

\`apps/web/src/LiveDictationPanel.tsx\` owns the new live layout; \`apps/web/src/PracticeControlPanel.tsx\` owns the secondary recorder styling and accurate accessible label. \`apps/web/src/PracticeCard.tsx\`, \`useLiveDictation\`, \`useRecorder\`, Electron IPC, model install/hashes, data storage and **all offline pipeline code are intentionally unchanged**.

## Responsive and accessibility acceptance criteria

- Keep **800×610**, **1160×760**, **1440×900** Electron windows usable with their actual 44px right-workspace titlebar and full-height left navigation. On very short displays the **idle-only placeholder** can disappear, but the **live start/stop action, real transcript while active, TTS, recorder and replay must remain operable**.
- A compact viewport may wrap the status text/button into two rows; avoid horizontal overflow. At normal height the visible placeholder sets the expectation of where dictation words appear.
- A stopped or unsupported recognizer must never animate a fake active mic level. The primary action is visibly **labeled** even without a tooltip; stop remains keyboard-reachable and not disabled by the start guard.
- AA target: readable body text contrast normally >=4.5:1; meaningful icon/border/focus contrast >=3:1. Test both Sunset and Nordic palettes against actual rendered backgrounds (alpha compositing makes code-only color checks insufficient).
- English/Chinese status, text labels, model recovery, mode switch and live microphone-level accessible name share one translation-key set; focus ring is semantic and honors \`prefers-reduced-motion\`. Avoid several aggressive ambient rings around an idle mic.
- External screenshot audit still required for 320×640, 390×844, 640×720, 800×610, 1160×760, 1440×900. Add **no-model, checking, live interim, stopped-final, history-expanded, online browser warning and record/replay active** states to real screenshots. The existing CI browser/Linux virtual Electron geometry evidence **does not imply** human-reviewed screenshots or native Windows/macOS accessibility approval.
- Pending physical Windows Narrator, macOS VoiceOver and Linux Orca, OS font scale, permission denial/recovery, keyboard Tab/Enter/Space/Escape, prolonged dictation, dual mic session guard and mouse hit targets must be documented with actual evidence rather than invented PASSED values.

## Regression and documentation map

| Evidence | Code/file | Expected verification |
| --- | --- | --- |
| Live primary semantics, current-only subtitle, history, model recovery and privacy | \`tests/live-dictation-v3.test.tsx\` | JSDOM state/interaction tests; no claim about actual pixel geometry |
| Existing real on-device/browserside capability and permission behavior | \`tests/desktop-dictation.test.tsx\`, \`tests/use-live-dictation.test.tsx\` | Existing tests must continue unchanged |
| "Record & replay" accessible label and language parity | \`tests/i18n-and-tooltips.test.tsx\`, \`apps/web/src/locales/*\` | Chinese/English translation keys match exactly |
| Existing class/style architecture | \`scripts/check-ui-style-architecture.mts\` | Tailwind 4 + Base UI reused; no legacy CSS |
| Actual browser/native layout and performance | CI browser screenshot / Linux Electron evidence and \`pnpm perf:budget\` | Evidence only for measured platforms/sizes; human visual review still required |
| Release readiness | [ASR release gate](../engineering/ASR-PUBLIC-RELEASE-GATE.md), [physical-device evidence ledger](../release/V1.0.4-PHYSICAL-DEVICE-EVIDENCE.md) | **HOLD** until official model provenance, license notices and 3-OS real mic tests explicitly approved |

## Release boundary

The **successful November 23 review-only installer build** [Actions 45152049592](https://github.com/kunlong-luo/voxnelo/actions/runs/45152049592) represents source \`7793c38315723f673c4c7c0d39d88f3a06082db8\`, **before these V3 UI edits**. None of those previously SHA-256-checked Windows/macOS/Linux installers contain this new UI. Do not claim they do. New UI source requires its own review artifact SHA and physical-device confirmation before any future distribution. The pre-existing v1.0.4 Draft Release ID \`428750217\` remains based on older \`4aeb58e\` with eight prior assets, still \`draft=true\` / \`published_at=null\` — it must not be overwritten or published by this UI work. The latest public v1.0.3 is unaffected.

## Subsequent (not implemented here)

- Consider progressive disclosure of right-hand stats/tips **only after** real 800×610 and 1160×760 screenshots confirm it materially improves discoverability.
- Evaluate font weight/sizes and static design token contrast with captured Sunset and Nordic screenshots; no theme replacement or unlicensed graphical assets.
- Document and human-test end-to-end live microphone flows and permissions per OS; improve performance and accuracy **only** from trusted direct-human benchmark evidence.


## V3 visual-evidence automation repair (2026-11-23, second pass)

**Confirmed source/test mismatch:** the pre-existing deep Chromium screenshot script `scripts/check-responsive-browser.mts` still asserted the pre-V3 icon-only live microphone was a 48–52px **circle**, centered in the card and surrounded by a continuous animated idle halo. PR #263 replaced that with a **text-labeled, rounded rectangular** start/stop button, removed the misleading idle halo, and committed to preserving user agency. Those old deep-UI expectations became invalid even though PR #263's normal core and three-platform packaging CI passed.

**Implementation:** the screenshot script now measures real browser pixels for the labeled live action's minimum **44px height**, at least **110px width**, accessible name equal to visible text, `aria-pressed=false` in the idle state, horizontal containment within the live panel, and zero legacy idle-microphone halos. It still tests real recorder activation and replay using Chromium's synthetic non-personal audio device, full responsive page screenshots, the two themes, long-phrase layout, local scrolling, the manual reduced-motion switch and Electron virtual desktop size/DPI checks. These checks do **not** substitute fake ASR text or claim microphone recognition accuracy.

**Scope / cost:** `.github/workflows/quality-deep.yml` now triggers on pull requests that actually change the practice UI, visual token CSS or these screenshot scripts; other PRs still use the existing normal CI and do not incur a full deep screenshot run. Maintainers can manually dispatch deep QA for release sign-off. This workflow runs with `contents: read`, generates `browser-layout-evidence` and `linux-electron-evidence` private artifacts, and does not create/upload GitHub Releases.

**Verification state:** source assertions in `tests/v3-browser-evidence-contract.test.ts` confirm the static QA contract; real browser/Electron results must be checked in the associated GitHub Actions run before marking the **new** V3 screenshot gate as passed. If visual assertions fail, preserve logs and screenshots and correct only verified problems. Linux virtual Electron screenshots never establish real Windows/macOS GUI or physical screen-reader acceptance.

**Release boundary:** [PR #263](https://github.com/kunlong-luo/voxnelo/pull/263) merged as `79062baff3a90b922735cb0b875e1339f4d527f2`; its V3 UI is in `main` source but not in the previous five SHA-checked v1.0.4 review installers from source `7793c383`. Publishing is still held pending original ASR model rights, third-party notices, human microphone trials and real-device a11y evidence.
