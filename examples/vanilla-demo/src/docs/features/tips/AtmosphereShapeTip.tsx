import { TIP_COLORS as C, TipCaption } from './tip-primitives';

/** Rim intensity across the disc for a soft and a sharp Fresnel exponent. */
export default function AtmosphereShapeTip() {
  // Intensity from the centre (x=0) to the silhouette (x=1) for power p and threshold t.
  const curve = (p: number, t: number): string => {
    const pts: string[] = [];
    for (let i = 0; i <= 40; i += 1) {
      const x = i / 40;
      const v = Math.max(0, (x - t) / (1 - t));
      const y = Math.pow(v, p);
      pts.push(`${(20 + x * 230).toFixed(1)} ${(96 - y * 78).toFixed(1)}`);
    }
    return `M${pts.join(' L')}`;
  };
  return (
    <>
      <svg viewBox="0 0 270 110" role="img" aria-label="Rim intensity curves: a low power spreads the glow, a high power hugs the edge">
        <line x1="20" y1="96" x2="250" y2="96" stroke={C.hair} />
        <line x1="20" y1="18" x2="20" y2="96" stroke={C.hair} />
        <path d={curve(0.6, 0.2)} fill="none" stroke={C.mist} strokeWidth="1.4" />
        <path d={curve(2, 0.6)} fill="none" stroke={C.atm} strokeWidth="1.6" />
        <path d={curve(4, 0.75)} fill="none" stroke={C.ember} strokeWidth="1.4" />
        <text x="22" y="14" fontSize="8" fill={C.mist} fontFamily="var(--font-mono)">glow</text>
        <text x="250" y="106" textAnchor="end" fontSize="8" fill={C.mist} fontFamily="var(--font-mono)">centre → silhouette</text>
        <text x="60" y="60" fontSize="8" fill={C.mist} fontFamily="var(--font-mono)">power 0.6</text>
        <text x="150" y="44" fontSize="8" fill={C.atm} fontFamily="var(--font-mono)">power 2 · threshold 0.6</text>
        <text x="196" y="30" fontSize="8" fill={C.ember} fontFamily="var(--font-mono)">power 4</text>
      </svg>
      <TipCaption>threshold moves where the rim starts; power decides how fast it brightens toward the edge.</TipCaption>
    </>
  );
}
