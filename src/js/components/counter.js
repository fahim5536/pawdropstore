import { gsap } from '../core/gsap.js';

export function initCounters() {
  const elements = document.querySelectorAll('.stats__num[data-target]');
  if (!elements.length) return;

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.target, 10);
        if (!isNaN(target)) {
          const obj = { val: 0 };
          gsap.to(obj, {
            val: target,
            duration: 2.2,
            ease: 'power2.out',
            onUpdate: function() {
              el.textContent = Math.floor(obj.val).toLocaleString();
            }
          });
        }
        
        observer.unobserve(el);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -10% 0px'
  });

  elements.forEach(el => observer.observe(el));
}
