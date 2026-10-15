/**
 * Decorative light ribbons inspired by docs/ui2.jpeg.
 * They do not sample the microphone or report pronunciation accuracy.
 */
const ribbons = Array.from({ length: 13 }, (_, line) => {
  const points = Array.from({ length: 145 }, (_, index) => {
    const t = index / 144;
    const envelope = Math.pow(Math.sin(Math.PI * t), 1.7);
    const waves = Math.sin(t * 18 * Math.PI + line * 0.43) * 16 +
      Math.sin(t * 10 * Math.PI - line * 0.62) * 14 +
      Math.cos(t * 29 * Math.PI + line * 0.22) * 4;
    const y = 78 + envelope * (waves + (line - 6) * 4.1);
    return (index === 0 ? 'M ' : 'L ') + (t * 900).toFixed(1) + ' ' + y.toFixed(1);
  });
  return points.join(' ');
});

export function WaveformArt() {
  return (
    <svg className="waveformArt" viewBox="0 0 900 156" preserveAspectRatio="none"
      aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="ribbonGlow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#e1a5ff" />
          <stop offset="31%" stopColor="#63ceff" />
          <stop offset="56%" stopColor="#2fffe5" />
          <stop offset="77%" stopColor="#fff2b9" />
          <stop offset="100%" stopColor="#f6d1a7" />
        </linearGradient>
        <filter id="ribbonBloom" x="-30%" y="-90%" width="160%" height="280%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      <g fill="none" stroke="url(#ribbonGlow)" strokeWidth="3" strokeLinecap="round" opacity=".66"
        filter="url(#ribbonBloom)">
        {ribbons.map((path, index) => <path d={path} key={'glow-' + index} />)}
      </g>
      <g fill="none" stroke="url(#ribbonGlow)" strokeWidth="1.65" strokeLinecap="round" opacity=".79">
        {ribbons.map((path, index) => <path d={path} key={index} />)}
      </g>
    </svg>
  );
}
