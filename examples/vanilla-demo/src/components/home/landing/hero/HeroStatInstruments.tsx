import {
  faBolt,
  faCheck,
  faGaugeHigh,
  faGrid2,
  faLayerGroup,
  faSparkles,
} from '@fortawesome/sharp-duotone-solid-svg-icons';
import { StatChip } from '../atoms';
import { cn } from '@/lib/utils';

const STATS = [
  { icon: faGrid2, value: '5', label: 'Visual kinds' },
  { icon: faLayerGroup, value: '9', label: 'Canonical layers' },
  { icon: faBolt, value: '4', label: 'Frameworks' },
  { icon: faGaugeHigh, value: '60 FPS', label: 'WebGL engine' },
  { icon: faCheck, value: '0', label: 'Dependencies' },
  { icon: faSparkles, value: 'MIT', label: 'Open source' },
] as const;

export function HeroStatInstruments({ className }: { readonly className?: string }) {
  return (
    <div
      className={cn(
        'relative z-20 mx-auto max-w-[1500px] rounded-3xl border border-white/[0.12] bg-[#09131f]/80 px-4 py-5 shadow-[0_24px_80px_-45px_rgba(34,211,238,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl',
        className,
      )}
    >
      <div className="grid grid-cols-6 divide-x divide-white/[0.08]">
        {STATS.map((s) => (
          <StatChip key={s.label} icon={s.icon} value={s.value} label={s.label} />
        ))}
      </div>
    </div>
  );
}
