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
  /** Exact existing base IPA, so edits to an old lesson fail closed. */
  standardIpa: string;
  /** One illustrative realization; never advertised as matching system TTS. */
  spokenIpa: string;
  rules: readonly ConnectedSpeechNote[];
}

export const CONNECTED_SPEECH_GUIDES: Readonly<Record<string, ConnectedSpeechGuide>> = {
  s008: {
    english: 'Nice to meet you.',
    standardIpa: '/naɪs tə miːt juː/',
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
    standardIpa: '/kæn juː hɛlp miː/',
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
    standardIpa: '/pliːz weɪt ə ˈmoʊmənt/',
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
    standardIpa: '/haʊ duː juː seɪ ðɪs/',
    spokenIpa: '[haʊ də jə seɪ ðɪs]',
    rules: [{
      span: 'do you',
      spokenIpa: '[də jə]',
      kind: 'weakForm',
      descriptionZh: 'do 和 you 在不强调时可弱化元音，语流更紧凑；需要强调问句中的某个词时可以保留完整读法。',
      descriptionEn: 'Unstressed do and you may reduce their vowels in flowing speech. Full forms are natural when emphasizing those words.',
    }],
  },
  s009: {
    english: 'See you later.',
    standardIpa: '/siː juː ˈleɪtər/',
    spokenIpa: '[si jə ˈleɪɾɚ]',
    rules: [
      {
        span: 'you',
        spokenIpa: '[jə]',
        kind: 'weakForm',
        descriptionZh: 'you 不强调时可以弱读为 [jə]；如果特别强调“你”，保留完整读法更自然。',
        descriptionEn: 'Unstressed you can reduce to [jə]. Keep its full form when the listener is being emphasized.',
      },
      {
        span: 'later',
        spokenIpa: '[ˈleɪɾɚ]',
        kind: 'flapping',
        descriptionZh: '在常见美式发音中，later 的元音之间 /t/ 可以变为闪音 [ɾ]，听起来接近很短的 d。',
        descriptionEn: 'In many US accents, the intervocalic /t/ in later is a quick flap [ɾ], similar to a very brief d.',
      },
    ],
  },
  s010: {
    english: 'Have a nice day.',
    standardIpa: '/hæv ə naɪs deɪ/',
    spokenIpa: '[hævə naɪs deɪ]',
    rules: [{
      span: 'Have a',
      spokenIpa: '[hævə]',
      kind: 'linking',
      descriptionZh: 'have 的词尾 /v/ 与 a 的元音 [ə] 直接衔接，中间无需停顿；这是连贯发音，而非省掉 a。',
      descriptionEn: 'The final /v/ of have joins the vowel [ə] in a without a pause. The word a is still pronounced.',
    }],
  },
  s013: {
    english: 'I live in China.',
    standardIpa: '/aɪ lɪv ɪn ˈtʃaɪnə/',
    spokenIpa: '[aɪ lɪvɪn ˈtʃaɪnə]',
    rules: [{
      span: 'live in',
      spokenIpa: '[lɪvɪn]',
      kind: 'linking',
      descriptionZh: 'live 词尾 /v/ 连接 in 开头的 /ɪ/，连续读出 [lɪvɪn]；两个单词的含义不变。',
      descriptionEn: 'The final /v/ of live links to the initial /ɪ/ of in, giving a smooth [lɪvɪn]. Both words remain present.',
    }],
  },
  s026: {
    english: 'Thank you very much.',
    standardIpa: '/θæŋk juː ˈvɛri mʌtʃ/',
    spokenIpa: '[θæŋk jə ˈvɛɹi mʌtʃ]',
    rules: [{
      span: 'you',
      spokenIpa: '[jə]',
      kind: 'weakForm',
      descriptionZh: '在日常感谢中，you 如果没有特别强调，可以从 /juː/ 弱读为 [jə]，把更明显的重音放在 very。',
      descriptionEn: 'When you is unstressed in everyday thanks, /juː/ may reduce to [jə], with more prominence on very.',
    }],
  },
  s037: {
    english: 'Where is the bathroom?',
    standardIpa: '/wer ɪz ðə ˈbæθruːm/',
    spokenIpa: '[wɛɹɪz ðə ˈbæθɹum]',
    rules: [{
      span: 'Where is',
      spokenIpa: '[wɛɹɪz]',
      kind: 'linking',
      descriptionZh: '美式英语中，where 的词尾 /ɹ/ 可以直接衔接 is 的 /ɪ/，形成连贯的 [wɛɹɪz]，不需要额外停顿。',
      descriptionEn: 'In American English, final /ɹ/ in where links naturally to the initial /ɪ/ in is, without an extra pause.',
    }],
  },
  s035: {
    english: 'What time is it?',
    standardIpa: '/wʌt taɪm ɪz ɪt/',
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

/** Require whole-word, unique spans so a typo or partial word cannot display misleading rules. */
function hasUniqueWordSpan(english:string,span:string):boolean {
  if (!span.trim() || span!==span.trim()) return false;
  const source=english.toLowerCase();
  const target=span.toLowerCase();
  let count=0,from=0;
  while(true){
    const index=source.indexOf(target,from);
    if(index<0)break;
    const before=source[index-1]??'';
    const after=source[index+target.length]??'';
    if(!/[a-z']/u.test(before)&&!/[a-z']/u.test(after))count++;
    from=index+1;
  }
  return count===1;
}
function phoneticBrackets(value:string):boolean {
  return /^\\[[^\\[\\]\\r\\n]+\\]$/u.test(value);
}

/** Never infer connected IPA for unannotated, edited, malformed or unreviewed sentences. */
export function getConnectedSpeechGuide(
  sentence: Pick<Sentence, 'id' | 'english' | 'ipa' | 'reviewStatus'>,
): ConnectedSpeechGuide | undefined {
  const guide=CONNECTED_SPEECH_GUIDES[sentence.id];
  if (!guide || !sentence.ipa || sentence.reviewStatus==='needs-review' ||
      guide.english!==sentence.english || guide.standardIpa!==sentence.ipa ||
      !phoneticBrackets(guide.spokenIpa) || guide.rules.length===0) return undefined;
  if(!guide.rules.every(rule=>
    hasUniqueWordSpan(guide.english,rule.span) && phoneticBrackets(rule.spokenIpa) &&
    rule.descriptionZh.trim().length>0 && rule.descriptionEn.trim().length>0
  ))return undefined;
  return guide;
}
