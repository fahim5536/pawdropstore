const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/<a href="\/profile\.html" class="nav__user" id="profileBtn"[^>]*>[\s\S]*?<\/a>\n?/g, '');
  fs.writeFileSync(file, content, 'utf8');
});
