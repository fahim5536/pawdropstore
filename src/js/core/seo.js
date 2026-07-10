/**
 * PAWDROP E-Commerce SEO & Structured Data Utility
 * Handles dynamic Open Graph (OG) meta tags, Twitter Cards, SEO titles/descriptions,
 * and JSON-LD structured data schema injections.
 */

/**
 * Updates page head SEO, Open Graph, and Twitter metadata.
 * Also appends or recreates Google E-commerce JSON-LD Product schema.
 */
export function updateProductSEO(product) {
  if (!product) return;

  const title = `${product.name} | PAWDROP Premium Pet Gear`;
  const description = `${product.desc || 'Premium pet gear and accessories.'} Shop high-quality dropshipping products on PAWDROP.`;
  const pageUrl = window.location.href;
  const imageUrl = product.img || 'https://picsum.photos/1200/630?random=og';

  // 1. Update document title
  document.title = title;

  // 2. Helper to set/create meta helper
  setMetaTag('description', description);
  setMetaTag('keywords', `pawdrop, ${product.name.toLowerCase()}, ${product.category.toLowerCase()}, premium pet gear, dog cats accessories`);

  // Open Graph
  setMetaProperty('og:title', title);
  setMetaProperty('og:description', description);
  setMetaProperty('og:image', imageUrl);
  setMetaProperty('og:url', pageUrl);
  setMetaProperty('og:type', 'product');

  // Twitter cards
  setMetaTag('twitter:title', title);
  setMetaTag('twitter:description', description);
  setMetaTag('twitter:image', imageUrl);
  setMetaTag('twitter:url', pageUrl);

  // 3. Inject structured JSON-LD Product schema
  injectProductJsonLd(product);
}

/**
 * Basic dynamic SEO update for standard pages
 */
export function updatePageSEO(titleText, descriptionText) {
  const fullTitle = `${titleText} | PAWDROP`;
  document.title = fullTitle;

  setMetaTag('description', descriptionText);
  setMetaProperty('og:title', fullTitle);
  setMetaProperty('og:description', descriptionText);
  setMetaTag('twitter:title', fullTitle);
  setMetaTag('twitter:description', descriptionText);

  // WebSite schema
  injectWebSiteJsonLd();
}

function setMetaTag(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setMetaProperty(property, content) {
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function injectProductJsonLd(product) {
  // Remove existing JSON-LD of product schema to avoid duplicates
  const existingSchema = document.getElementById('pawdrop-product-jsonld');
  if (existingSchema) {
    existingSchema.remove();
  }

  const pPrice = Number(product.price) || 0;
  const isAvailable = true; // Dropshipping usually stays in-stock

  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.name,
    "image": [
      product.img
    ],
    "description": product.desc || 'Premium curated pet accessories on PawDrop.',
    "sku": `PD-${product.id}`,
    "brand": {
      "@type": "Brand",
      "name": "PAWDROP"
    },
    "offers": {
      "@type": "Offer",
      "url": window.location.href,
      "priceCurrency": "USD",
      "price": pPrice.toFixed(2),
      "itemCondition": "https://schema.org/NewCondition",
      "availability": isAvailable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": "PAWDROP"
      }
    }
  };

  const script = document.createElement('script');
  script.id = 'pawdrop-product-jsonld';
  script.type = 'application/ld+json';
  script.text = JSON.stringify(jsonLd);
  document.head.appendChild(script);
}

function injectWebSiteJsonLd() {
  const existingSchema = document.getElementById('pawdrop-website-jsonld');
  if (existingSchema) return; // Only need one

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "PAWDROP",
    "url": window.location.origin,
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${window.location.origin}/shop.html?search={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };

  const script = document.createElement('script');
  script.id = 'pawdrop-website-jsonld';
  script.type = 'application/ld+json';
  script.text = JSON.stringify(jsonLd);
  document.head.appendChild(script);
}
