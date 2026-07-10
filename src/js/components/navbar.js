import { gsap } from '../core/gsap.js';

export function initNavbar() {
  const nav = document.getElementById('nav');
  const burger = document.getElementById('burger');
  const mobileMenu = document.getElementById('mobileMenu');
  let isOpen = false;

  // Handle Back Button navigation and visibility dynamically
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    const isHomepage = window.location.pathname === '/' || window.location.pathname.endsWith('index.html') || window.location.pathname === '';
    if (!isHomepage) {
      backBtn.style.display = 'flex';
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (document.referrer && document.referrer.includes(window.location.host)) {
          window.history.back();
        } else {
          window.location.href = 'index.html';
        }
      });
    } else {
      backBtn.style.display = 'none';
    }
  }

  // Active state highlighting for mobile horizontal menu
  const mobileBarLinks = document.querySelectorAll('.nav__mobile-bar a');
  if (mobileBarLinks.length > 0) {
    const currentPath = window.location.pathname;
    mobileBarLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (currentPath.endsWith(href) || (currentPath === '/' && href === 'index.html')) {
        link.classList.add('nav__link--active');
      } else {
        link.classList.remove('nav__link--active');
      }
    });
  }

  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('is-scrolled', window.scrollY > 60);
    });
  }

  if (burger && mobileMenu) {
    burger.addEventListener('click', () => {
      isOpen = !isOpen;
      burger.classList.toggle('is-active', isOpen);
      if (isOpen) {
        mobileMenu.classList.add('is-open');
        gsap.fromTo(mobileMenu,
          { x: '100%', opacity: 0 },
          { x: '0%', opacity: 1, duration: 0.5, ease: 'power4.out' }
        );
      } else {
        gsap.to(mobileMenu, {
          x: '100%', opacity: 0, duration: 0.4, ease: 'power4.in',
          onComplete: () => {
            mobileMenu.classList.remove('is-open');
          }
        });
      }
    });

    // Close button click listener inside the drawer
    const closeBtn = document.getElementById('mobileMenuCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (isOpen) {
          burger.click();
        }
      });
    }

    // Theme toggle mapping from mobile drawer to desktop switcher
    const mobileThemeToggleBtn = document.getElementById('mobileThemeToggleBtn');
    if (mobileThemeToggleBtn) {
      mobileThemeToggleBtn.addEventListener('click', () => {
        const desktopThemeBtn = document.getElementById('themeToggleBtn');
        if (desktopThemeBtn) {
          desktopThemeBtn.click();
        }
      });
    }

    // Search logic inside mobile drawer
    const mobileSearchInput = document.getElementById('mobileSearchInput');
    const mobileSearchBtn = document.getElementById('mobileSearchBtn');
    if (mobileSearchInput) {
      const triggerSearch = () => {
        const q = mobileSearchInput.value.trim();
        if (q) {
          window.location.href = `shop.html?q=${encodeURIComponent(q)}`;
        }
      };
      mobileSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          triggerSearch();
        }
      });
      if (mobileSearchBtn) {
        mobileSearchBtn.addEventListener('click', triggerSearch);
      }
    }

    // Close mobile menu on clicking links
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        isOpen = false;
        burger.classList.remove('is-active');
        gsap.to(mobileMenu, {
          x: '100%', opacity: 0, duration: 0.4, ease: 'power4.in',
          onComplete: () => {
            mobileMenu.classList.remove('is-open');
          }
        });
      });
    });
  }
}
