# Documentation and release gap audit — 2026-11-16

Scope: main branch source files inspected: README.md, docs/USER-GUIDE.md, docs/engineering/STABLE-RELEASE-READINESS.md, docs/release/V0.1-PRD-CHECKLIST.md, docs/Voxnelo-Product-Docs-v1.0/README.md, package.json, and issue #201. This is a bounded source review, not an exhaustive source-code or hardware audit.

## Confirmed documentation inconsistencies

- docs/USER-GUIDE.md is headed v1.0.0 and links the v1.0.0 release while README.md identifies v1.0.3 as latest public release and v1.0.4 as unpublished candidate.
- docs/release/V0.1-PRD-CHECKLIST.md links README.DEVELOPMENT.md; current development guide is docs/DEVELOPMENT.md.
- The product baseline README explicitly states that Markdown has implementation updates while its bundled original DOCX/PDF remain frozen. Do not claim identical versions.
- Issue #201 records no completed linguist approval or licensed independent audio takes. Do not represent system TTS as approved human recordings.

## Recommendations requiring deeper evidence

- Trace every F001–F012 requirement to exact code symbols and automated tests, then record human validation separately.
- Review all release notes and CI workflows for public-release versus draft wording.
- Add automated relative-link checking and package-script references validation, with fixture tests.
- Establish reproducible ASR WER/CER and latency measurements with disclosed corpus, reference transcripts, hardware, versions and consent; do not fabricate results.
- Perform UI accessibility checks for keyboard navigation, focus, labels, reduced motion, contrast, and three-platform real-device behavior.
- Inventory historical engineering documents and label their supersession status before moving or deleting anything.

## Evidence boundaries

The repository's automated package checks do not certify device playback, acoustic quality, rights, signing or accessibility. The source package version 1.0.4 is not proof of a public 1.0.4 release. This audit does not assert a full PRD-to-code matrix or benchmark measurements have been completed.
