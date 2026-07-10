const fs = require('fs');
const path = require('path');

const files = ['index.html', 'shop.html', 'about.html', 'faq.html', 'contact.html', 'orders.html', 'wishlist.html'];

const styleTag = `  <style>
    body { background: #111112; margin: 0; }
    body.is-loading > *:not(.preloader) { opacity: 0; visibility: hidden; pointer-events: none; }
    .preloader { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: #0a0a0a; z-index: 1000; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 40px; }
    .preloader__logo { font-family: sans-serif; font-size: 48px; font-weight: 700; letter-spacing: 0.15em; color: #fff; }
    .preloader__logo .neon { color: #b0ff00; }
  </style>
</head>`;

for (const file of files) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('body.is-loading > *:not(.preloader)')) {
      content = content.replace('</head>', styleTag);
      fs.writeFileSync(filePath, content);
      console.log(`Updated ${file}`);
    }
  }
}
