const fs = require('fs');

const userBtnHtml = `
        <button class="nav__user" id="authBtn" aria-label="Sign In" style="background: none; border: none; color: var(--white); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; transition: color 0.3s ease;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </button>
`;

const authModalHtml = `
  <!-- AUTH MODAL -->
  <div class="modal-overlay" id="authOverlay">
    <div class="modal" id="authModal">
      <button class="modal__close" id="authClose" aria-label="Close Auth">✕</button>
      
      <div class="auth-tabs" style="display: flex; gap: 20px; margin-bottom: 30px; border-bottom: 1px solid var(--border);">
        <button class="auth-tab is-active" id="tabSignIn" style="background:none; border:none; color:var(--neon); font-family:var(--font-display); font-size:18px; padding-bottom:10px; cursor:pointer;">SIGN IN</button>
        <button class="auth-tab" id="tabSignUp" style="background:none; border:none; color:var(--gray); font-family:var(--font-display); font-size:18px; padding-bottom:10px; cursor:pointer;">SIGN UP</button>
      </div>

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

// Also, the user wants the loading system to be "more beautiful"
// To do this, let's update the preloader color or animation in CSS separately.
// For now, let's add auth to pages.

const files = ['index.html', 'shop.html', 'about.html', 'faq.html', 'contact.html'];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Add User button before Cart button
    if (!content.includes('id="authBtn"')) {
      content = content.replace(
        /<button class="nav__cart" id="cartBtn"/g, 
        userBtnHtml + '\n        <button class="nav__cart" id="cartBtn"'
      );
    }
    
    // Add Auth modal before TRACKING MODAL or at the end of body
    if (!content.includes('id="authOverlay"')) {
      if (content.includes('<!-- TRACKING MODAL -->')) {
        content = content.replace(
          '<!-- TRACKING MODAL -->',
          authModalHtml + '\n\n  <!-- TRACKING MODAL -->'
        );
      } else {
        content = content.replace(
          '</body>',
          authModalHtml + '\n</body>'
        );
      }
    }
    
    fs.writeFileSync(file, content);
  }
});

console.log('Auth modal added to all HTML files');
