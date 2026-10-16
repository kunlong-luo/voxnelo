/** Decorative rhythm only: never an audio level, VAD result or live transcript. */
export function WaveformArt() {
  return <svg className="waveformArt h-auto max-h-22 w-full [@media(max-height:680px)]:max-h-12"
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
    <g fill="none" stroke="url(#voxneloRhythm)" strokeWidth="1.8" strokeLinecap="round" opacity=".63">
      <use href="#voxneloRibbon" transform="translate(0 -12)"/>
      <use href="#voxneloRibbon" transform="translate(0 -6)"/>
      <use href="#voxneloRibbon"/>
      <use href="#voxneloRibbon" transform="translate(0 6)"/>
      <use href="#voxneloRibbon" transform="translate(0 12)"/>
    </g>
  </svg>;
}
