import type { CountryDataMap, StarfieldConfig } from '@your-globe/core';
import { DecorationGlobe, type DecorationGlobeReadyApi } from '@/components/shared';
import { cn } from '@/lib/utils';

const STARS: StarfieldConfig = {
  enabled: true,
  density: 700,
  size: 1,
  sizeVariety: 0.65,
  palette: ['#ffffff', '#ffe9c4', '#67e8f9'],
  twinkle: { enabled: true, intensity: 0.42, speed: 0.32 },
};

// Mock per-country populations (millions). Selection covers the four
// continents we'd want to show populated; unmapped countries skip the
// scale and stay at the kind's default fill.
const MOCK_DATA: CountryDataMap = {
  US: { value: 332 },
  CN: { value: 1412 },
  IN: { value: 1380 },
  BR: { value: 213 },
  RU: { value: 144 },
  NG: { value: 219 },
  EG: { value: 109 },
  AU: { value: 26 },
  DE: { value: 84 },
  JP: { value: 125 },
  ZA: { value: 60 },
  AR: { value: 45 },
  ID: { value: 273 },
};

export interface ChoroplethStageProps {
  readonly className?: string;
  readonly onReady?: (api: DecorationGlobeReadyApi) => void;
}

/**
 * Real `setCountryData` invocation against the paper kind. The palette
 * uses cyan→magenta to read clearly even when the paper texture
 * underneath stays warm. The legend pill bottom-right just labels the
 * encoding — production legends would call `globe.showLegend(scale)`.
 */
export function ChoroplethStage({ className, onReady }: ChoroplethStageProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[1.8rem] border border-white/[0.08] bg-[#02030a]',
        className,
      )}
    >
      <DecorationGlobe
        kind="paper"
        theme="paper-default"
        speed={0.014}
        initialLat={14}
        initialLng={20}
        starfield={STARS}
        atmosphere
        framingPadding={0.08}
        interactive={false}
        onReady={(ready) => {
          ready.instance.setCountryData(MOCK_DATA, {
            type: 'sequential',
            palette: ['#22d3ee', '#f472b6'],
            domain: [0, 1500],
            noDataColor: '#1e293b',
          });
          onReady?.(ready);
        }}
        className="absolute inset-0 m-auto size-[min(78vmin,560px)]"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,transparent_0%,rgba(2,3,10,0.18)_52%,#02030a_92%)]" />

      <div className="absolute bottom-4 right-4 rounded-xl border border-white/[0.08] bg-black/55 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400 backdrop-blur-md">
        choropleth · sequential cyan→magenta
      </div>
    </div>
  );
}
