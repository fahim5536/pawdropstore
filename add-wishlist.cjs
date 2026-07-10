const fs = require('fs');

const files = ['about.html', 'faq.html', 'contact.html', 'orders.html'];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let html = fs.readFileSync(file, 'utf8');
    
    // Add WISHLIST to nav
    html = html.replace(/<li><a href="\/contact\.html">CONTACT<\/a><\/li>\s*<li><a href="#" id="navTrackBtn" class="neon">TRACK ORDER<\/a><\/li>/g, `<li><a href="/contact.html">CONTACT</a></li>\n        <li><a href="/wishlist.html">WISHLIST</a></li>\n        <li><a href="#" id="navTrackBtn" class="neon">TRACK ORDER</a></li>`);
    
    html = html.replace(/<li><a href="\/contact\.html">CONTACT<\/a><\/li>\s*<\/ul>\s*<\/div>/g, `<li><a href="/contact.html">CONTACT</a></li>\n      <li><a href="/wishlist.html">WISHLIST</a></li>\n    </ul>\n  </div>`);
    
    fs.writeFileSync(file, html);
    console.log(`Updated ${file}`);
  }
});
