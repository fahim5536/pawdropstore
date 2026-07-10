export const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-revealed');
      observer.unobserve(entry.target);
    }
  });
}, {
  rootMargin: '0px 0px -15% 0px',
  threshold: 0.1
});

export function observeReveals(elements) {
  if (!elements) return;
  const els = elements instanceof NodeList || Array.isArray(elements) ? elements : [elements];
  els.forEach(el => revealObserver.observe(el));
}
