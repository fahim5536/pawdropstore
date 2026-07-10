import { gsap as gsapNamed } from 'gsap';
import gsapDefault from 'gsap';
import { ScrollTrigger as ScrollTriggerNamed } from 'gsap/ScrollTrigger';
import ScrollTriggerDefault from 'gsap/ScrollTrigger';

const rawGsap = gsapNamed || gsapDefault;
const gsap = (rawGsap && typeof rawGsap === 'object' && 'gsap' in rawGsap) ? rawGsap.gsap : rawGsap;

const rawScrollTrigger = ScrollTriggerNamed || ScrollTriggerDefault;
const ScrollTrigger = (rawScrollTrigger && typeof rawScrollTrigger === 'object' && 'ScrollTrigger' in rawScrollTrigger) ? rawScrollTrigger.ScrollTrigger : rawScrollTrigger;

if (gsap && typeof gsap.registerPlugin === 'function' && ScrollTrigger) {
  try {
    gsap.registerPlugin(ScrollTrigger);
  } catch (err) {
    console.warn("GSAP registerPlugin failed:", err);
  }
} else {
  console.warn("GSAP or ScrollTrigger could not be resolved from imports.");
}

// Hero text reveal
export function heroReveal() {
  const lines = document.querySelectorAll('.hero__line');
  gsap.fromTo(lines,
    { y: '110%', opacity: 0 },
    {
      y: '0%',
      opacity: 1,
      duration: 1.1,
      ease: 'power4.out',
      stagger: 0.12,
      delay: 0.3
    }
  );
  gsap.fromTo('.hero__tag, .hero__sub, .hero__cta',
    { y: 30, opacity: 0 },
    {
      y: 0, opacity: 1,
      duration: 0.9,
      ease: 'power3.out',
      stagger: 0.1,
      delay: 0.7
    }
  );
}

export { gsap, ScrollTrigger };
