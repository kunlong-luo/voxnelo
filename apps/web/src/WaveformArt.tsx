/** Decorative rhythm only: never an audio level, VAD result or live transcript. */
export function WaveformArt() {
  return <svg className="waveformArt h-auto max-h-22 w-full [@media(max-height:900px)]:max-h-10"
    viewBox="0 0 780 132" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="voxneloRhythm" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="var(--brand-blush)"/>
        <stop offset="40%" stopColor="var(--primary)"/>
        <stop offset="75%" stopColor="var(--brand-mist)"/>
        <stop offset="100%" stopColor="var(--primary)"/>
      </linearGradient>
      <path id="voxneloRibbon" d="M 0 66 C 100 66 130 68 190 56 S 280 105 350 54 S 444 22 505 65 S 602 91 660 65 S 750 66 780 66"/>
    </defs>
    <g fill="none" stroke="url(#voxneloRhythm)" strokeWidth="1.8" strokeLinecap="round">
      {[
        { offset:-12, delay:'motion-safe:[animation-delay:0ms]' },
        { offset:-6, delay:'motion-safe:[animation-delay:-700ms]' },
        { offset:0, delay:'motion-safe:[animation-delay:-1400ms]' },
        { offset:6, delay:'motion-safe:[animation-delay:-2100ms]' },
        { offset:12, delay:'motion-safe:[animation-delay:-2800ms]' },
      ].map(({offset,delay})=><g key={offset} data-motion="ribbon-flow" className={`motion-safe:animate-ribbon-flow ${delay}`}>
        <use href="#voxneloRibbon" transform={`translate(0 ${offset})`}/>
      </g>)}
    </g>
  </svg>;
}
