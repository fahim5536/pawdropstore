const fs = require('fs');

function syncHTMLComponents() {
  const indexStr = fs.readFileSync('index.html', 'utf8');
  
  // Extract nav
  const navMatch = indexStr.match(/<!-- NAVBAR -->\s*(<nav[\s\S]*?<\/nav>)/);
  const mobileMenuMatch = indexStr.match(/(<!-- MOBILE MENU START -->[\s\S]*?<!-- MOBILE MENU END -->)/) || indexStr.match(/(<!-- MOBILE MENU -->\s*[\s\S]*?<\/div>)/);
  const footerMatch = indexStr.match(/<!-- FOOTER -->\s*(<footer[\s\S]*?<\/footer>)/);
  
  if (!navMatch || !footerMatch) {
    console.error("Could not find nav or footer in index.html");
    return;
  }
  
  const navComponent = navMatch[1];
  const footerComponent = footerMatch[1];
  const mobileMenuComponent = mobileMenuMatch ? mobileMenuMatch[1] : '';
  
  const filesToUpdate = ['orders.html', 'wishlist.html', 'about.html', 'shop.html', 'faq.html', 'contact.html', 'profile.html', 'privacy.html'];
  
  for (const file of filesToUpdate) {
    if (!fs.existsSync(file)) continue;
    
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace Nav
    if (content.includes('<nav class="navbar" id="navbar">')) {
       content = content.replace(/<nav class="navbar" id="navbar">[\s\S]*?<\/nav>/, navComponent);
    } else if (content.includes('<nav class="nav" id="nav">')) {
       content = content.replace(/<nav class="nav" id="nav">[\s\S]*?<\/nav>/, navComponent);
    }
    
    // Replace Mobile Menu (robust healing strategy)
    if (content.includes('<!-- MOBILE MENU START -->')) {
      content = content.replace(/<!-- MOBILE MENU START -->[\s\S]*?<!-- MOBILE MENU END -->/g, mobileMenuComponent);
    } else if (content.includes('id="mobileMenu"')) {
      content = content.replace(/<div class="mobile-menu" id="mobileMenu">[\s\S]*?<\/div>\s*(?=(?:<!--\s*(?:ABOUT|PRODUCTS|CONTACT|FAQ|CHECKOUT|CART|WISHLIST|PROFILE|ORDER|HERO|PRIVACY|TERMS|LEGAL))|<main|<section)/gi, mobileMenuComponent);
    } else {
      content = content.replace(/(<\/nav>\s*)/, `$1\n${mobileMenuComponent}\n`);
    }

    // Replace Footer
    content = content.replace(/<footer class="footer"[\s\S]*?<\/footer>/, footerComponent);
    
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated components in ${file}`);
  }
}

syncHTMLComponents();
