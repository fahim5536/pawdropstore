const fs = require('fs');

const cssPath = 'src/css';
const fg = require('fs'); // Just use fs.readFileSync

function replaceAlpha(file) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/rgba\(17,\s*17,\s*18,\s*0\.75\)/g, 'var(--bg-alpha)');
    content = content.replace(/rgba\(17,\s*17,\s*18,\s*0\.8\)/g, 'var(--bg-alpha)');
    content = content.replace(/rgba\(10,\s*10,\s*10,\s*0\.85\)/g, 'var(--bg-alpha)');
    content = content.replace(/rgba\(0,\s*0,\s*0,\s*0\.75\)/g, 'var(--modal-bg)');
    content = content.replace(/rgba\(0,\s*0,\s*0,\s*0\.6\)/g, 'var(--modal-bg)');
    fs.writeFileSync(file, content, 'utf8');
}

replaceAlpha(cssPath + '/components/navbar.css');
replaceAlpha(cssPath + '/utils/animations.css');
replaceAlpha(cssPath + '/components/checkout.css');
replaceAlpha(cssPath + '/components/products.css');
replaceAlpha(cssPath + '/components/cart.css');
