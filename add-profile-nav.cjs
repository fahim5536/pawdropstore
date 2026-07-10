const fs = require('fs');

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

const profileLink = `
        <a href="/profile.html" class="nav__user" id="profileBtn" aria-label="Profile" style="background: none; border: none; color: var(--white); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; transition: color 0.3s ease; text-decoration: none;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </a>`;

// We also have 'authBtn' in some pages, we should rename/replace it with profileBtn for logged in users, or just handle it dynamically via JS or just put both and hide via auth.js.

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('id="profileBtn"')) {
     if (content.includes('id="authBtn"')) {
        content = content.replace(/(<button[^>]*id="authBtn"[^>]*>[\s\S]*?<\/button>)/, `$1\n${profileLink}`);
     } else {
        // Fallback or handle nav__actions
     }
     fs.writeFileSync(file, content, 'utf8');
  }
});

console.log("Profile link added.");
