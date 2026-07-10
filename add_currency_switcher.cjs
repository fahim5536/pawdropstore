const fs = require('fs');

const files = ['index.html', 'shop.html', 'about.html', 'faq.html', 'contact.html', 'orders.html', 'wishlist.html'];

const switcherHTML = `
        <select class="currency-switcher neon" style="background: transparent; border: 1px solid var(--neon); color: var(--neon); border-radius: 4px; padding: 4px 8px; font-family: var(--font-mono); font-size: 12px; cursor: pointer; outline: none; appearance: none; -webkit-appearance: none; margin-right: 10px;">
          <option value="USD" style="background: #111; color: var(--neon);">USD ($)</option>
          <option value="EUR" style="background: #111; color: var(--neon);">EUR (€)</option>
          <option value="GBP" style="background: #111; color: var(--neon);">GBP (£)</option>
        </select>
        `;

files.forEach(file => {
  if (fs.existsSync(file)) {
    let html = fs.readFileSync(file, 'utf8');

    if (!html.includes('class="currency-switcher"')) {
      html = html.replace(/<div class="nav__actions"[^>]*>/, match => match + '\n' + switcherHTML);
      fs.writeFileSync(file, html);
      console.log(`Updated ${file}`);
    } else {
      console.log(`Already updated ${file}`);
    }
  }
});
