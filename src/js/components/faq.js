import { gsap } from '../core/gsap.js';

export function initFAQ() {
  const faqItems = document.querySelectorAll('.faq__item');
  if (!faqItems.length) return;

  faqItems.forEach(item => {
    const question = item.querySelector('.faq__question');
    const answer = item.querySelector('.faq__answer');

    question.addEventListener('click', () => {
      const isActive = question.classList.contains('is-active');

      // Close all other instances
      faqItems.forEach(otherItem => {
        if (otherItem !== item) {
          const otherQuestion = otherItem.querySelector('.faq__question');
          const otherAnswer = otherItem.querySelector('.faq__answer');
          
          if (otherQuestion.classList.contains('is-active')) {
            otherQuestion.classList.remove('is-active');
            gsap.to(otherAnswer, { height: 0, duration: 0.4, ease: 'power2.out' });
          }
        }
      });

      // Toggle current instance
      if (isActive) {
        question.classList.remove('is-active');
        gsap.to(answer, { height: 0, duration: 0.4, ease: 'power2.out' });
      } else {
        question.classList.add('is-active');
        gsap.set(answer, { height: 'auto' });
        const targetHeight = answer.offsetHeight;
        gsap.fromTo(answer, 
          { height: 0 }, 
          { height: targetHeight, duration: 0.4, ease: 'power2.out' }
        );
      }
      
      // Update ScrollTrigger if it exists for reveal animations
      if (window.ScrollTrigger) {
        setTimeout(() => window.ScrollTrigger.refresh(), 400);
      }
    });
  });
}
