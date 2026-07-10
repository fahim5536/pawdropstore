import { gsap } from './gsap.js';
import { heroReveal } from './gsap.js';
import { observeReveals } from './observer.js';

export function initLoader() {
  const loader = document.getElementById('preloader');
  if (!loader) {
    try {
      document.body.classList.remove('is-loading');
      try { heroReveal(); } catch (e) { console.error("Error running heroReveal:", e); }
      try { observeReveals(document.querySelectorAll('[data-reveal]')); } catch (e) { console.error("Error running observeReveals:", e); }
    } catch (err) {
      console.error("Error in loader cleanup when loader element is missing:", err);
    }
    return;
  }

  const bar = loader.querySelector('.preloader__bar');
  const count = loader.querySelector('.preloader__count');
  const logo = loader.querySelector('.preloader__logo');

  // Failsafe if elements missing
  if (!bar && !count && !logo) {
    loader.style.display = 'none';
    document.body.classList.remove('is-loading');
    try { heroReveal(); } catch (e) { console.error("Error running heroReveal:", e); }
    try { observeReveals(document.querySelectorAll('[data-reveal]')); } catch (e) { console.error("Error running observeReveals:", e); }
    return;
  }

  let progress = { val: 0 };
  let isFullyLoaded = false;
  let tween = null;

  // Function to finish the loading animation once resources are loaded
  const finishLoading = () => {
    if (isFullyLoaded) return;
    isFullyLoaded = true;

    // Stop current active tween if running
    if (tween) {
      try { tween.kill(); } catch (e) {}
    }

    if (!gsap || typeof gsap.to !== 'function') {
      if (bar) bar.style.transform = 'scaleX(1)';
      if (count) count.textContent = '100%';
      hideLoader();
      return;
    }

    tween = gsap.to(progress, {
      val: 100,
      duration: 0.3,
      ease: 'power1.out',
      onUpdate: () => {
        try {
          if (bar) bar.style.transform = `scaleX(${progress.val / 100})`;
          if (count) count.textContent = Math.floor(progress.val) + '%';
        } catch (e) {}
      },
      onComplete: () => {
        hideLoader();
      }
    });
  };

  const hideLoader = () => {
    if (!gsap || typeof gsap.to !== 'function') {
      loader.style.display = 'none';
      document.body.classList.remove('is-loading');
      try { heroReveal(); } catch (e) { console.error("Error running heroReveal:", e); }
      try { observeReveals(document.querySelectorAll('[data-reveal]')); } catch (e) { console.error("Error running observeReveals:", e); }
      return;
    }

    try {
      const tl = gsap.timeline({
        onComplete: () => {
          try {
            loader.style.display = 'none';
            document.body.classList.remove('is-loading');
            try { heroReveal(); } catch (e) { console.error("Error running heroReveal:", e); }
            try { observeReveals(document.querySelectorAll('[data-reveal]')); } catch (e) { console.error("Error running observeReveals:", e); }
          } catch (e) {
            console.error("Error in loader timeline onComplete child:", e);
          }
        }
      });
      
      const targets = [];
      if (bar) targets.push(bar);
      if (count) targets.push(count);
      if (logo) targets.push(logo);

      if (targets.length > 0) {
        tl.to(targets, {
          opacity: 0,
          y: -20,
          duration: 0.3,
          stagger: 0.08,
          ease: 'power2.in'
        }).to(loader, {
          y: '-100%',
          duration: 0.6,
          ease: 'power3.inOut'
        }, "-=0.15");
      } else {
        tl.to(loader, { opacity: 0, duration: 0.4 });
      }
    } catch (err) {
      console.error("Error in loader timeline construction:", err);
      loader.style.display = 'none';
      document.body.classList.remove('is-loading');
      try { heroReveal(); } catch (e) { console.error("Error running heroReveal:", e); }
      try { observeReveals(document.querySelectorAll('[data-reveal]')); } catch (e) { console.error("Error running observeReveals:", e); }
    }
  };

  // Start with a smooth progression from 0 to 90% immediately to show activity
  if (gsap && typeof gsap.to === 'function') {
    tween = gsap.to(progress, {
      val: 90,
      duration: 1.8,
      ease: 'power2.out',
      onUpdate: () => {
        try {
          if (bar) bar.style.transform = `scaleX(${progress.val / 100})`;
          if (count) count.textContent = Math.floor(progress.val) + '%';
        } catch (e) {}
      }
    });
  } else {
    // If GSAP is missing, use a safe interval fallback
    const interval = setInterval(() => {
      if (progress.val < 90) {
        progress.val += 5;
        if (bar) bar.style.transform = `scaleX(${progress.val / 100})`;
        if (count) count.textContent = Math.floor(progress.val) + '%';
      } else {
        clearInterval(interval);
      }
    }, 50);
  }

  // Bind the window load event to trigger the remaining 100% completion
  if (document.readyState === 'complete') {
    finishLoading();
  } else {
    window.addEventListener('load', finishLoading);
    // Ultimate safety timeout to prevent permanent blocking (2.5 seconds)
    setTimeout(finishLoading, 2500);
  }
}
