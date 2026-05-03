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
export { default as AuroraBlur } from './AuroraBlur';
// `Beams` deliberately omitted — its only consumer is `@react-three/fiber@9`
// + `@react-three/drei@10`, which require React 19. We're on React 18, and
// the version mismatch crashes the React reconciler at module-eval time
// (the barrel evaluates every re-exported file even if unused). Re-add the
// component via the shadcn CLI when we either upgrade React or downgrade
// the @react-three packages — see git blame for context.
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
