import { gsap } from '../core/gsap.js';

export function initNewsletter() {
  const form = document.getElementById('newsletterForm');
  const input = document.getElementById('newsletterEmail');
  const msg = document.getElementById('newsletterMsg');

  if (!form || !input || !msg) return;

  // Subtle pulse hover effect on the entire form when hovering over the email input
  let pulseTween = null;

  input.addEventListener('mouseenter', () => {
    if (pulseTween) pulseTween.kill();
    pulseTween = gsap.timeline({ repeat: -1, yoyo: true })
      .to(form, {
        scale: 1.015,
        boxShadow: '0 0 20px rgba(210, 255, 0, 0.25)',
        duration: 0.7,
        ease: 'sine.inOut'
      });
  });

  input.addEventListener('mouseleave', () => {
    if (pulseTween) {
      pulseTween.kill();
      pulseTween = null;
    }
    gsap.to(form, {
      scale: 1,
      boxShadow: '0 0 0px rgba(0, 0, 0, 0)',
      duration: 0.3,
      ease: 'power2.out'
    });
  });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailStr = input.value.trim();

    if (!emailStr) {
      msg.textContent = 'Email is required.';
      msg.className = 'newsletter-msg error';
      return;
    }

    if (!emailRegex.test(emailStr)) {
      msg.textContent = 'Please enter a valid email address.';
      msg.className = 'newsletter-msg error';
      return;
    }

    // Success state
    msg.textContent = 'Thanks for subscribing!';
    msg.className = 'newsletter-msg success';
    input.value = '';

    // GSAP bounce animation
    gsap.fromTo(msg, 
      { scale: 0.5, opacity: 0, y: 10 },
      { scale: 1, opacity: 1, y: 0, duration: 0.6, ease: 'back.out(2)' }
    );
  });
}
