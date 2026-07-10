const fs = require('fs');
const files = ['index.html', 'about.html', 'shop.html', 'contact.html', 'faq.html'];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Replace Water Fountains link
  content = content.replace(/<li><a href="\/shop\.html">Water Fountains<\/a><\/li>/g, '<li><a href="/shop.html?category=hydration">Water Fountains</a></li>');
  
  // Replace Pet Bowls link
  content = content.replace(/<li><a href="\/shop\.html">Pet Bowls<\/a><\/li>/g, '<li><a href="/shop.html?category=feeding">Pet Bowls</a></li>');

  // Replace LED Collars link
  content = content.replace(/<li><a href="\/shop\.html">LED Collars<\/a><\/li>/g, '<li><a href="/shop.html?category=safety">LED Collars</a></li>');

  // Replace Toys link
  content = content.replace(/<li><a href="\/shop\.html">Toys<\/a><\/li>/g, '<li><a href="/shop.html?category=play">Toys</a></li>');

  // Replace Grooming link
  content = content.replace(/<li><a href="\/shop\.html">Grooming<\/a><\/li>/g, '<li><a href="/shop.html?category=grooming">Grooming</a></li>');
  
  // Replace Privacy Policy link
  content = content.replace(/<li><a href="#">Privacy Policy<\/a><\/li>/g, '<li><a href="/privacy.html">Privacy Policy</a></li>');

  // Replace the `#` for "Track Order" with logic tying to modal
  content = content.replace(/<li><a href="#" id="footerTrackBtn">Track Order<\/a><\/li>/g, '<li><a href="#" class="footerTrackBtnLink">Track Order</a></li>');
  
  fs.writeFileSync(file, content);
});
console.log('Fixed footer links in all files.');
