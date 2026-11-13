import type { Sentence } from './sentences';

/**
 * Curated, example-only descriptions of possible American-English connected
 * speech. Square brackets denote one casual realization, NOT a phonemic
 * dictionary reading, deterministic spelling-to-IPA or a TTS transcript.
 * Language QA on every new example remains required for public acceptance.
 */
export type ConnectedSpeechRuleKind = 'assimilation' | 'weakForm' | 'flapping' | 'linking';

export interface ConnectedSpeechNote {
  /** Exact contiguous words in the matching English sentence. */
  span: string;
  /** One possible contextual pronunciation of this span. */
  spokenIpa: string;
  kind: ConnectedSpeechRuleKind;
  descriptionZh: string;
  descriptionEn: string;
}

export interface ConnectedSpeechGuide {
  /** Text must match the current sentence to prevent stale ID annotations. */
  english: string;
  /** One illustrative realization; never advertised as matching system TTS. */
  spokenIpa: string;
  rules: readonly ConnectedSpeechNote[];
}

export const CONNECTED_SPEECH_GUIDES: Readonly<Record<string, ConnectedSpeechGuide>> = {
  s008: {
    english: 'Nice to meet you.',
    spokenIpa: '[naɪs tə miːtʃu]',
    rules: [{
      span: 'meet you',
      spokenIpa: '[miːtʃu]',
      kind: 'assimilation',
      descriptionZh: '词尾 /t/ 与后面的 /j/ 相遇，在自然语速下可能融合为 [tʃ]；慢速清晰朗读也可以不融合。',
      descriptionEn: 'Final /t/ before /j/ can merge into [tʃ] in casual speech. Careful speech may keep the sounds separate.',
    }],
  },
  s022: {
    english: 'Can you help me?',
    spokenIpa: '[kən jə ˈhɛlp mi]',
    rules: [{
      span: 'Can you',
      spokenIpa: '[kən jə]',
      kind: 'weakForm',
      descriptionZh: '不强调能力时，can 常弱读为 [kən]，you 可以弱读为 [jə]；重点落在 help 上。强调 can 时不要强行弱读。',
      descriptionEn: 'Unstressed can may become [kən] and you may become [jə], with prominence on help. An emphasized can stays strong.',
    }],
  },
  s023: {
    english: 'Please wait a moment.',
    spokenIpa: '[pliːz ˈweɪɾə ˈmoʊmənt]',
    rules: [{
      span: 'wait a',
      spokenIpa: '[weɪɾə]',
      kind: 'flapping',
      descriptionZh: '美式英语中，元音之间的 /t/ 在合适的重音环境下可发为很短的闪音 [ɾ]，听起来接近快速的 d，但不是改了拼写。',
      descriptionEn: 'In many US accents, intervocalic /t/ can be a brief flap [ɾ] in this stress context. The spelling does not change.',
    }],
  },
  s030: {
    english: 'How do you say this?',
    spokenIpa: '[haʊ də jə seɪ ðɪs]',
    rules: [{
      span: 'do you',
      spokenIpa: '[də jə]',
      kind: 'weakForm',
      descriptionZh: 'do 和 you 在不强调时可弱化元音，语流更紧凑；需要强调问句中的某个词时可以保留完整读法。',
      descriptionEn: 'Unstressed do and you may reduce their vowels in flowing speech. Full forms are natural when emphasizing those words.',
    }],
  },
  s035: {
    english: 'What time is it?',
    spokenIpa: '[wʌt ˈtaɪmɪzɪt]',
    rules: [{
      span: 'time is',
      spokenIpa: '[taɪmɪz]',
      kind: 'linking',
      descriptionZh: 'time 末尾的 /m/ 直接衔接 is 开头的 /ɪ/，中间不额外插入停顿；连读不是删除单词。',
      descriptionEn: 'The final /m/ of time flows into the initial /ɪ/ of is without an extra pause; linking does not delete a word.',
    }],
  },
} as const;

/** Never infer connected IPA for unannotated, edited or unreviewed sentences. */
export function getConnectedSpeechGuide(
  sentence: Pick<Sentence, 'id' | 'english' | 'ipa' | 'reviewStatus'>,
): ConnectedSpeechGuide | undefined {
  const guide=CONNECTED_SPEECH_GUIDES[sentence.id];
  return sentence.ipa && sentence.reviewStatus!=='needs-review' && guide?.english===sentence.english
    ? guide : undefined;
}
