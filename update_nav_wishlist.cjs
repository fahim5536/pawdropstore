const fs = require('fs');

const files = ['index.html', 'shop.html', 'about.html', 'faq.html', 'contact.html', 'orders.html', 'wishlist.html'];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let html = fs.readFileSync(file, 'utf8');

    if (!html.includes('id="wishlistBtn"')) {
      const wishlistButtonHTML = `
        <a href="/wishlist.html" class="nav__user" id="wishlistBtn" aria-label="Wishlist" style="background: none; border: none; color: var(--white); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; transition: color 0.3s ease; position: relative; text-decoration: none;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
          <span class="nav__cart-count" id="wishlistCount" style="right: 2px;">0</span>
        </a>`;

      html = html.replace(/<button class="nav__cart"/, wishlistButtonHTML + '\n        <button class="nav__cart"');
      fs.writeFileSync(file, html);
      console.log(`Updated ${file}`);
    } else {
      console.log(`Already updated ${file}`);
    }
  }
});
