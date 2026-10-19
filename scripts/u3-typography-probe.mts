/**
 * Synthetic typography-only U3 stress fixture for public browser/Electron CI.
 * This never changes lessons, IndexedDB, TTS, recorder state, or production UI.
 * The original text and the root font-size are restored after each sample.
 */
export const U3_STRESS_ENGLISH =
  "Could you please tell me which platform I should use and how much time is left before the next train leaves the station?";
export const U3_STRESS_CHINESE =
  "请问你可以告诉我应该去哪个站台，以及下一班列车离开车站之前还剩下多少时间吗？";
export const U3_STRESS_IPA =
  "/kʊd juː pliːz tɛl miː wɪtʃ ˈplætfɔːrm aɪ ʃʊd juːz ænd haʊ mʌtʃ taɪm ɪz lɛft bɪˈfɔːr ðə nɛkst treɪn liːvz ðə ˈsteɪʃən/";

export function injectU3TypographyProbe(fontSizePercent: 125 | 150): string {
  return `(()=>{
    const phrase=document.querySelector('.sentenceText');
    const translation=document.querySelector('.translation');
    let ipa=document.querySelector('.ipa');
    if(!phrase||!translation)throw Error('Missing lesson text');
    // Draft expansion lessons legitimately have no reviewed IPA. Add a
    // test-only paragraph with identical Tailwind classes, then remove it.
    if(!ipa){
      const content=document.querySelector('.sentenceContent');
      if(!content)throw Error('Missing lesson content');
      ipa=document.createElement('p');
      ipa.className='ipa max-w-full min-w-0 text-sm leading-6 wrap-anywhere text-ipa-ink';
      ipa.setAttribute('data-u3-typography-probe','true');
      content.insertBefore(ipa,content.lastElementChild);
    }
    document.documentElement.style.fontSize=${JSON.stringify(fontSizePercent+'%')};
    phrase.textContent=${JSON.stringify(U3_STRESS_ENGLISH)};
    translation.textContent=${JSON.stringify(U3_STRESS_CHINESE)};
    ipa.textContent=${JSON.stringify(U3_STRESS_IPA)};
    return true;
  })()`;
}

/**
 * Layout geometry sampled inside the real browser after the stress fixture.
 * False is an explicit failure; viewport scrolling is okay on small windows,
 * but the workspace must keep all primary actions/controls reachable.
 */
export const U3_TYPOGRAPHY_METRICS = `(()=>{
  const select=(selector)=>{
    const element=document.querySelector(selector);
    if(!element)throw Error('Missing U3 element: '+selector);
    return element;
  };
  const rect=(selector)=>select(selector).getBoundingClientRect();
  const phrase=rect('.sentenceText'),translation=rect('.translation'),ipa=rect('.ipa');
  const focus=rect('.lessonFocus'),card=rect('.practiceCard'),hero=rect('.dictationAction');
  const rail=rect('.actionRail'),footer=rect('.referenceFooter');
  const next=rect('.nextButton'),previous=rect('.prevButton');
  const workspace=select('.content'),doc=document.documentElement;
  const epsilon=2;
  const horizontal=(r)=>r.left>=card.left-epsilon&&r.right<=card.right+epsilon;
  const textOrder=phrase.bottom<=translation.top+epsilon&&translation.bottom<=ipa.top+epsilon;
  const actionOrder=ipa.bottom<=hero.top+epsilon&&hero.bottom<=rail.top+epsilon
    &&rail.bottom<=footer.top+epsilon;
  const navInside=next.left>=footer.left-epsilon&&next.right<=footer.right+epsilon
    &&previous.left>=footer.left-epsilon&&previous.right<=footer.right+epsilon;
  const contentOverflow=workspace.scrollHeight>workspace.clientHeight+2;
  const localScroll=getComputedStyle(workspace).overflowY==='auto';
  return {
    viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,
    fontSize:parseFloat(getComputedStyle(doc).fontSize),
    lineCount:Math.round(phrase.height/parseFloat(getComputedStyle(select('.sentenceText')).lineHeight)),
    horizontalContent:horizontal(phrase)&&horizontal(translation)&&horizontal(ipa)&&horizontal(hero)
      &&horizontal(rail)&&horizontal(footer),
    textOrder,actionOrder,navInside,
    phraseBottom:Math.round(phrase.bottom),translationTop:Math.round(translation.top),
    translationBottom:Math.round(translation.bottom),ipaTop:Math.round(ipa.top),
    entranceAnimations:select('.sentenceText').getAnimations().filter(a=>a.playState==='running').length+
      select('.translation').getAnimations().filter(a=>a.playState==='running').length,
    maxDocumentOverflow:doc.scrollWidth-doc.clientWidth,
    localScroll,contentOverflow,
    heroTop:Math.round(hero.top),heroBottom:Math.round(hero.bottom),
    footerBottom:Math.round(footer.bottom),
    focusHeight:Math.round(focus.height),
    minTouchWidth:Math.min(hero.width,rect('.recordAction').width,previous.width,next.width)
  };
})()`;
