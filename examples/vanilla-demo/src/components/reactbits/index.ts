// All ReactBits primitives in one place. Each component lives in its own
// file (the shadcn registry installs them flat); this barrel just gathers
// the default exports under named symbols so call-sites stay clean:
//
//   import { Aurora, BlurText, Magnet } from '@/components/reactbits';
//
// When swapping a free-tier component for a Pro variant later, only the
// re-export in this file changes — the call-sites stay put.

export { default as AnimatedContent } from './AnimatedContent';
export { default as Aurora } from './Aurora';
export { default as Beams } from './Beams';
export { default as BlurText } from './BlurText';
export { default as ClickSpark } from './ClickSpark';
export { default as CountUp } from './CountUp';
export { default as DotGrid } from './DotGrid';
export { default as FadeContent } from './FadeContent';
export { default as GradientText } from './GradientText';
export { default as MagicBento } from './MagicBento';
export { default as Magnet } from './Magnet';
export { default as ScrollVelocity } from './ScrollVelocity';
export { default as ShinyText } from './ShinyText';
export { default as SplitText } from './SplitText';
export { default as SpotlightCard } from './SpotlightCard';
export { default as StarBorder } from './StarBorder';
export { default as Threads } from './Threads';
export { default as TiltedCard } from './TiltedCard';
