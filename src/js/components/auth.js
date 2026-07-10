import { gsap } from '../core/gsap.js';
import { 
  loginWithEmail, 
  signupWithEmail, 
  loginWithGoogle, 
  loginWithApple,
  logoutUser,
  auth
} from '../firebase.js';
import { onAuthStateChanged } from 'firebase/auth';

export function initAuth() {
  const authBtns = document.querySelectorAll('#authBtn');

  // Dynamically inject the auth modal if it doesn't exist on the current page
  if (!document.getElementById('authOverlay')) {
    const authHtml = `
      <div class="modal-overlay" id="authOverlay">
        <div class="modal" id="authModal">
          <button class="modal__close" id="authClose" aria-label="Close Auth">✕</button>
          
          <div class="auth-tabs" style="display: flex; gap: 20px; margin-bottom: 30px; border-bottom: 1px solid var(--border);">
            <button class="auth-tab is-active" id="tabSignIn" style="background:none; border:none; color:var(--neon); font-family:var(--font-display); font-size:18px; padding-bottom:10px; cursor:pointer;">SIGN IN</button>
            <button class="auth-tab" id="tabSignUp" style="background:none; border:none; color:var(--gray); font-family:var(--font-display); font-size:18px; padding-bottom:10px; cursor:pointer;">SIGN UP</button>
          </div>

          <div id="authSocialContainer" style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px;">
            <button type="button" class="btn btn--outline btn--full" onclick="handleGoogleLogin()" style="font-size: 14px; text-transform: uppercase;">
              Sign in with Google
            </button>
            <button type="button" class="btn btn--outline btn--full" onclick="handleAppleLogin()" style="font-size: 14px; text-transform: uppercase;">
              Sign in with Apple
            </button>
          </div>
          <div style="text-align: center; color: var(--gray); font-size: 12px; margin-bottom: 20px; text-transform: uppercase;">or</div>

          <form class="checkout-form" id="signInForm">
            <div class="form-group">
              <label>EMAIL ADDRESS</label>
              <input type="email" required placeholder="john@email.com">
            </div>
            <div class="form-group">
              <label>PASSWORD</label>
              <input type="password" required placeholder="••••••••">
            </div>
            <button type="submit" class="btn btn--fill btn--full">SIGN IN →</button>
          </form>

          <form class="checkout-form" id="signUpForm" style="display: none;">
            <div class="form-group">
              <label>FULL NAME</label>
              <input type="text" required placeholder="John Doe">
            </div>
            <div class="form-group">
              <label>EMAIL ADDRESS</label>
              <input type="email" required placeholder="john@email.com">
            </div>
            <div class="form-group">
              <label>PASSWORD</label>
              <input type="password" required placeholder="••••••••" minlength="6">
            </div>
            <button type="submit" class="btn btn--fill btn--full">CREATE ACCOUNT →</button>
          </form>
          
          <div id="authMsg" style="margin-top: 15px; font-family: var(--font-mono); font-size: 14px; text-align: center; color: var(--neon); display: none;"></div>
        </div>
      </div>
    `;
    const container = document.createElement('div');
    container.innerHTML = authHtml;
    document.body.appendChild(container.firstElementChild);
  }

  const overlay = document.getElementById('authOverlay');
  const modalClose = document.getElementById('authClose');
  const modal = document.getElementById('authModal');
  
  const tabSignIn = document.getElementById('tabSignIn');
  const tabSignUp = document.getElementById('tabSignUp');
  const signInForm = document.getElementById('signInForm');
  const signUpForm = document.getElementById('signUpForm');
  const authMsg = document.getElementById('authMsg');
  const authButtonsContainer = document.getElementById('authSocialContainer');

  let currentUser = null;

  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    const profileBtns = document.querySelectorAll('#profileBtn');
    if (user) {
      // User is signed in. Hide authBtn, show profileBtn
      authBtns.forEach(btn => btn.style.display = 'none');
      profileBtns.forEach(btn => {
        btn.style.display = 'flex';
        const initials = user.displayName ? user.displayName.substring(0, 2).toUpperCase() : 'ME';
        btn.innerHTML = `<div style="width: 24px; height: 24px; border-radius: 50%; background: var(--neon); color: var(--black); font-size: 10px; font-weight: bold; display: flex; align-items: center; justify-content: center; font-family: var(--font-display);">${initials}</div>`;
      });
    } else {
      // User is signed out. Show authBtn, hide profileBtn
      authBtns.forEach(btn => btn.style.display = 'flex');
      profileBtns.forEach(btn => btn.style.display = 'none');
    }
    // Dispatch event so cart/checkout knows the auth state changed
    window.dispatchEvent(new CustomEvent('auth-changed', { detail: { user }}));
  });

  if (!overlay || !modal) return;

  function openModal(e) {
    if (e && e.type !== 'open-auth-modal') {
      e.preventDefault();
    }
    if (currentUser) {
      window.location.href = '/profile.html';
      return;
    }
    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    gsap.fromTo(modal, 
      { y: 50, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }
    );
    if (e && e.detail && e.detail.message) {
      showMessage(e.detail.message, e.detail.isError);
    }
  }

  function closeModal() {
    gsap.to(modal, {
      y: 50,
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in',
      onComplete: () => {
        overlay.classList.remove('is-open');
        document.body.style.overflow = '';
        authMsg.style.display = 'none';
        signInForm.reset();
        signUpForm.reset();
      }
    });
  }

  function showMessage(msg, isError = false) {
    authMsg.textContent = msg;
    authMsg.style.color = isError ? 'red' : 'var(--neon)';
    authMsg.style.display = 'block';
    gsap.fromTo(authMsg, { opacity: 0, y: 10 }, { opacity: 1, y: 0 });
  }

  authBtns.forEach(btn => btn.addEventListener('click', openModal));
  window.addEventListener('open-auth-modal', openModal);
  modalClose?.addEventListener('click', closeModal);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Tabs logic
  tabSignIn?.addEventListener('click', () => {
    tabSignIn.style.color = 'var(--neon)';
    tabSignUp.style.color = 'var(--gray)';
    signInForm.style.display = 'block';
    signUpForm.style.display = 'none';
    authMsg.style.display = 'none';
  });

  tabSignUp?.addEventListener('click', () => {
    tabSignUp.style.color = 'var(--neon)';
    tabSignIn.style.color = 'var(--gray)';
    signUpForm.style.display = 'block';
    signInForm.style.display = 'none';
    authMsg.style.display = 'none';
  });

  // Form submits
  signInForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = signInForm.querySelector('button');
    const email = signInForm.querySelector('input[type="email"]').value;
    const pwd = signInForm.querySelector('input[type="password"]').value;
    const originalText = btn.textContent;
    btn.textContent = 'SIGNING IN...';
    try {
      await loginWithEmail(email, pwd);
      showMessage('Successfully signed in!');
      setTimeout(closeModal, 1500);
    } catch (err) {
      showMessage(err.message, true);
    } finally {
      btn.textContent = originalText;
    }
  });

  signUpForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = signUpForm.querySelector('button');
    const name = signUpForm.querySelector('input[type="text"]').value;
    const email = signUpForm.querySelector('input[type="email"]').value;
    const pwd = signUpForm.querySelector('input[type="password"]').value;
    const originalText = btn.textContent;
    btn.textContent = 'CREATING...';
    try {
      await signupWithEmail(name, email, pwd);
      showMessage('Account created successfully!');
      setTimeout(closeModal, 1500);
    } catch (err) {
      showMessage(err.message, true);
    } finally {
      btn.textContent = originalText;
    }
  });

  // Social Auth
  window.handleGoogleLogin = async function() {
    try {
      await loginWithGoogle();
      showMessage('Signed in with Google!');
      setTimeout(closeModal, 1500);
    } catch(err) {
      showMessage(err.message, true);
    }
  };

  window.handleAppleLogin = async function() {
    try {
      await loginWithApple();
      showMessage('Signed in with Apple!');
      setTimeout(closeModal, 1500);
    } catch(err) {
      showMessage(err.message, true);
    }
  };
}
