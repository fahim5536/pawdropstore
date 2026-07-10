import Lenis from '@studio-freight/lenis';
import { gsap, ScrollTrigger } from './gsap.js';

const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)), // Clean, standardized exponential easing
  smoothWheel: true,
  smoothTouch: false,
  wheelMultiplier: 1.1,  // Enhanced scroll multiplier for natural responsive speed
  touchMultiplier: 1.5,  // Balanced touch gesture momentum
  normalizeWheel: true,  // Normalize different browser scrolling steps (Chrome, Safari, Firefox etc.)
});

function raf(time) {
  lenis.raf(time);
  ScrollTrigger.update();
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

export default lenis;
