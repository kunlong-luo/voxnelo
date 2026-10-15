/**
 * Quiet Nordic decorative rhythm lines. Not a microphone waveform,
 * acoustic measurement, pronunciation score or recording visualization.
 */
const ribbons = Array.from({ length: 9 }, (_, line) => {
  const points = Array.from({ length: 125 }, (_, index) => {
    const t = index / 124;
    const envelope = Math.pow(Math.sin(Math.PI * t), 1.7);
    const waves = Math.sin(t * 13 * Math.PI + line * .35) * 13 +
      Math.sin(t * 7 * Math.PI - line * .6) * 8;
    const y = 66 + envelope * (waves + (line - 4) * 4);
    return (index === 0 ? 'M ' : 'L ') + (t * 780).toFixed(1) + ' ' + y.toFixed(1);
  });
  return points.join(' ');
});

export function WaveformArt() {
  return (
    <svg className="waveformArt h-auto max-h-22 w-full" viewBox="0 0 780 132" preserveAspectRatio="none"
      aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="nordicRhythm" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--brand-mist)" />
          <stop offset="38%" stopColor="var(--primary)" />
          <stop offset="65%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--brand-mist)" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#nordicRhythm)" strokeWidth="1.7" strokeLinecap="round" opacity=".78">
        {ribbons.map((path, index) => <path d={path} key={index} />)}
      </g>
    </svg>
  );
}
