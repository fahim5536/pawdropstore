const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/background:\s*#111112;/g, 'background: var(--black, #111112);');
  content = content.replace(/color:\s*#fff;/g, 'color: var(--white, #fff);');
  fs.writeFileSync(file, content, 'utf8');
});

const jsFiles = ['src/js/trackOrder.js', 'src/js/components/checkout.js'];
jsFiles.forEach(file => {
    if(fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        content = content.replace(/#18181a/g, 'var(--black-2)');
        content = content.replace(/#fff/g, 'var(--white)');
        content = content.replace(/#111112/g, 'var(--black)');
        content = content.replace(/rgba\(255,255,255,0\.1\)/g, 'var(--border)');
        fs.writeFileSync(file, content, 'utf8');
    }
});
