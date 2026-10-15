# ADR-0001：V0.1 参考发音暂用系统 TTS

- Status: Accepted
- Date: 2026-10-15

## Context

PRD F003（`docs/Voxnelo-Product-Docs-v1.0/docs/02-产品需求PRD.md`）与技术架构
（`docs/Voxnelo-Product-Docs-v1.0/docs/06-技术架构与数据设计.md` §7）要求参考音频
可合法分发、首版关键句不依赖在线 TTS；`07-课程与内容策略.md` §3 要求每句具备
`referenceAudioId` 等字段。实现现状（`packages/audio/speech.ts`）仅调用系统
`speechSynthesis` TTS，仓库内无 `assets/audio/` 与任何授权音频资产，
`Sentence` 接口也无 `referenceAudioId` 字段。

## Decision

V0.1 接受以系统 TTS 作为唯一的参考发音来源，不在 V0.1 引入授权录音资产；
`README.DEVELOPMENT.md` 已如实声明“不保证有专业录音的准确性”，课程 IPA 仅为
待复核的教学参考。

## Consequences

- 发音质量随用户系统语音包而异，不可作为教学准确性承诺；发布前须完成
  `docs/12-工程实施与交付边界.md` 验收清单中的“课程发音复核”与“合法授权参考音频”两项。
- 后续版本若引入授权音频，需补 `assets/audio/` 管线、`Sentence.referenceAudioId`
  字段与配套迁移，并以新的 ADR 修订本决策。
