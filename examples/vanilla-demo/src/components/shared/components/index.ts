// Reusable visual / behavioural blocks built on top of the ui/ + reactbits/
// primitives. Anything in here is meant to outlive any single route — drop
// into the studio, the marketing home, future docs pages, etc.

export {
  DecorationGlobe,
  type DecorationGlobeProps,
  type DecorationGlobeReadyApi,
} from './DecorationGlobe';
export { DependsOn, type DependsOnProps } from './DependsOn';
export { InteractiveCard, type InteractiveCardProps } from './InteractiveCard';
export { Kbd, type KbdProps } from './Kbd';
export { NoiseOverlay } from './NoiseOverlay';
export { ScrollProgress } from './ScrollProgress';
export { SectionHeader, type SectionHeaderProps } from './SectionHeader';
