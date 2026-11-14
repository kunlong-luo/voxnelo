# Short-phrase pronunciation and connected speech — approved feature extension

**Target:** next release after the already-created private v1.0.4 Draft (do not alter that Draft). **Scope:** owner-requested enhancement to PRD F001 short-phrase learning / F002 listen to example, beyond the frozen V0.1 minimum baseline.

## Experience

- Always show the current English sentence and its Chinese meaning in the practice card.
- With IPA enabled (default), show **standard US reference IPA** whenever already available in source content.
- For a small, explicitly annotated subset of starter phrases, also show **one possible casual connected-speech realization** in phonetic **square brackets** (not phonemic slashes) with an expandable **relevant rule**:
  - sound assimilation (/t/ + /j/ can yield [tʃ]);
  - unstressed function-word weak forms;
  - General American intervocalic /t/ flapping to [ɾ];
  - consonant-to-vowel linking without invented or deleted tokens.
- Within each rule show the **exact source span**, its local phonetic example, an explanation in Chinese/English, and a reminder that accent/tempo/stress matter.
- The **listen** button reuses the existing device/browser system TTS pipeline, slow/normal playback control, disabled-while-recording guard and sentence-switch cancellation. It plays **the original written sentence**, not IPA as TTS text. Do **not** label it authentic human reference audio or assert that it perfectly matches the example connected IPA. Two distinct validated audio tracks do **not** exist yet, so do not fake a separate natural-speech playback mode.
- A sentence with no base IPA shows its existing “awaiting review” state; one with IPA but without a curated connected example shows a truthful “pending” message. Never synthesize IPA from arbitrary sentence strings and never claim to provide a pronunciation score from ASR.
- Expand/collapse rule details with keyboard-friendly branded buttons. Changing sentences remounts the panel so the former sentence's rule list cannot carry over.
- In **favorites and review lists**, preview the same already-available standard and connected IPA alongside each saved phrase; selecting the row opens the main practice card with the actual playback and rule explanation. Do not nest a second playback button inside a list-row button.

## Release and quality constraints

- Initial **ten starter examples** are editorial **illustrations pending expert linguistic review**. The annotations are not a claim that a real recording or speech API matches them; accent, focus and speech rate can alter realization. Keep examples reviewable at sentence ID and exact English text; failure of the text match suppresses annotations.
- Existing 40 starter sentence IDs, 240 expansion IDs, IndexedDB history/favorites, F001–F012 practice loop and microphone consent are unchanged. No new permissions, network services, generated audio, third-party assets or storage migration.
- Each example now records the **exact existing sentence text and standard IPA**, so editing either suppresses stale connected-speech hints. Rule spans must point to a unique complete word or contiguous words within the sentence, and both sentence-level and rule-level spoken forms must be enclosed in phonetic square brackets. Invalid data fails closed, never falls back to fabricated phonetics.
- The next five editorial examples are **See you later.** (weak form and US flapping), **Have a nice day.** (linking), **I live in China.** (linking), **Thank you very much.** (weak form) and **Where is the bathroom?** (linking). They are possible casual US realizations, not a verified recording transcript.
- Future expansions require language-expert checks for standard/connected IPA, translation, rule span alignment and any audio provenance; make the metadata optional and explicitly approved, not mass-created.
- Manual checks required before a public build: desktop keyboard/focus, 125–150% scaling, long sentence wrapping, small window, voiced output/device unavailability and live recording guard. CI covers the rendered guide, localization, document semantics and packaging but is not real-device audio QA.

## Acceptance tests

- `tests/connected-speech-guide.test.tsx` ensures data/ID/text/base-IPA alignment, complete-word rule spans, multi-rule rendering, accurate fallback, bilingual rule labels, expand/collapse, and disabled speech while recording.
- Existing speech, i18n, data-integrity, history, desktop window and packaging checks must remain green.
