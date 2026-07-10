import { renderProducts } from './cart.js';
import { products } from '../data/products.js';
import { subscribeToFirestoreProducts } from '../firebase.js';

export function initSearch() {
  const searchInput = document.getElementById('navSearchInput');
  if (!searchInput) return;

  const navSearch = searchInput.parentElement;
  if (!navSearch) return;

  // Enhance input with extra right padding to accommodate the microphone icon
  searchInput.style.paddingRight = '35px';

  // Create and append the real-time search overlay element
  const overlay = document.createElement('div');
  overlay.className = 'nav__search-overlay';
  overlay.id = 'searchOverlay';
  navSearch.appendChild(overlay);

  let firestoreProducts = [];

  // Register real-time Firestore product listener
  try {
    subscribeToFirestoreProducts((list) => {
      console.log("[Firestore Search] Subscribed list update of", list.length, "items.");
      firestoreProducts = list;
    });
  } catch (err) {
    console.warn("[Firestore Search] Could not subscribe to Firestore, falling back to cached local products:", err);
  }

  // Helper search list filter execution
  const executeSearch = (query) => {
    const queryLower = query.toLowerCase().trim();
    if (queryLower === '') {
      renderProducts(products);
      return;
    }

    const filtered = products.filter(p => 
      p.name.toLowerCase().includes(queryLower) || 
      p.desc.toLowerCase().includes(queryLower) || 
      p.category.toLowerCase().includes(queryLower)
    );

    renderProducts(filtered);
    
    if (window.ScrollTrigger) {
      window.ScrollTrigger.refresh();
    }
  };

  // Render the matching products inside our elegant overlay
  const renderOverlayResults = (query) => {
    const qLower = query.toLowerCase().trim();
    if (!qLower) {
      overlay.innerHTML = '';
      overlay.classList.remove('active');
      return;
    }

    overlay.classList.add('active');

    // Use Firestore real-time collection or fall back to native list
    const sourceList = firestoreProducts.length > 0 ? firestoreProducts : products;

    const matched = sourceList.filter(p => 
      (p.name || '').toLowerCase().includes(qLower) || 
      (p.desc || p.description || '').toLowerCase().includes(qLower) || 
      (p.category || '').toLowerCase().includes(qLower)
    );

    if (matched.length === 0) {
      overlay.innerHTML = `<div class="search-overlay__state">No products found matching "${query}"</div>`;
      return;
    }

    overlay.innerHTML = `
      <div class="search-overlay__section-title">Matching Products (${matched.length})</div>
      <div class="search-overlay__list">
        ${matched.slice(0, 6).map(p => {
          const formattedPrice = typeof p.price === 'number' ? `$${p.price.toFixed(2)}` : (p.price || '$0.00');
          const imgSrc = p.img || p.image || 'https://picsum.photos/100/100?random=' + p.id;
          return `
            <a href="/shop.html?q=${encodeURIComponent(p.name)}" class="search-overlay__item" data-id="${p.id}">
              <div class="search-overlay__thumb-wrapper">
                <img class="search-overlay__thumb" src="${imgSrc}" alt="${p.name || 'Product'}" referrerpolicy="no-referrer" />
              </div>
              <div class="search-overlay__details">
                <div class="search-overlay__name">${p.name || 'Pet Item'}</div>
                <div class="search-overlay__meta">
                  <span class="search-overlay__category">${p.category || 'PETS'}</span>
                  <span class="search-overlay__price">${formattedPrice}</span>
                </div>
              </div>
            </a>
          `;
        }).join('')}
      </div>
    `;

    // Hook click event to close overlay upon link navigation
    overlay.querySelectorAll('.search-overlay__item').forEach(el => {
      el.addEventListener('click', () => {
        overlay.classList.remove('active');
      });
    });
  };

  // 1. Live type event listeners
  searchInput.addEventListener('input', (e) => {
    const term = e.target.value;
    executeSearch(term);
    renderOverlayResults(term);
  });

  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim()) {
      renderOverlayResults(searchInput.value);
    }
  });

  // Close search overlay if clicking outside the Search elements
  document.addEventListener('click', (e) => {
    if (!navSearch.contains(e.target)) {
      overlay.classList.remove('active');
    }
  });

  // 2. Redirect on Enter key if not on a page with a products grid
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const value = searchInput.value.trim();
      const grid = document.getElementById('productsGrid');
      if (!grid && value) {
        window.location.href = `/shop.html?q=${encodeURIComponent(value)}`;
      } else {
        overlay.classList.remove('active');
      }
    }
  });

  // 3. Web Speech API Voice search integration
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    const micBtn = document.createElement('button');
    micBtn.type = 'button';
    micBtn.className = 'nav__mic-btn';
    micBtn.setAttribute('aria-label', 'Search accessories by voice');
    micBtn.title = 'Search products by voice';
    micBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
        <path d="M19 10v1a7 7 0 0 1-14 0v-1"></path>
        <line x1="12" y1="19" x2="12" y2="23"></line>
        <line x1="8" y1="23" x2="16" y2="23"></line>
      </svg>
    `;

    navSearch.appendChild(micBtn);

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    let isListening = false;

    micBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isListening) {
        recognition.stop();
      } else {
        try {
          recognition.start();
        } catch (err) {
          console.warn('Voice recognition starting failed:', err);
        }
      }
    });

    recognition.onstart = () => {
      isListening = true;
      micBtn.classList.add('is-listening');
      searchInput.placeholder = 'Listening...';
      searchInput.value = '';
    };

    recognition.onend = () => {
      isListening = false;
      micBtn.classList.remove('is-listening');
      searchInput.placeholder = 'Search...';
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error encountered:', event.error);
      isListening = false;
      micBtn.classList.remove('is-listening');
      searchInput.placeholder = 'Search...';
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const cleanText = transcript.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
      searchInput.value = cleanText;
      
      // Update local grid immediately
      executeSearch(cleanText);
      renderOverlayResults(cleanText);

      // Handle page redirect if not on catalog pages
      const grid = document.getElementById('productsGrid');
      if (!grid && cleanText) {
        window.location.href = `shop.html?q=${encodeURIComponent(cleanText)}`;
      }
    };
  }

  // 3b. Mobile Search Input Web Speech API Voice search integration
  if (SpeechRecognition) {
    const mobileSearchInput = document.getElementById('mobileSearchInput');
    const mobileSearchBox = mobileSearchInput ? mobileSearchInput.parentElement : null;

    if (mobileSearchInput && mobileSearchBox) {
      // Increase padding-right of mobile search input to fit the microphone button nicely
      mobileSearchInput.style.paddingRight = '84px';

      const mobileMicBtn = document.createElement('button');
      mobileMicBtn.type = 'button';
      mobileMicBtn.className = 'mobile-search-box__mic-btn';
      mobileMicBtn.setAttribute('aria-label', 'Search products by voice');
      mobileMicBtn.title = 'Search products by voice';
      mobileMicBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
          <path d="M19 10v1a7 7 0 0 1-14 0v-1"></path>
          <line x1="12" y1="19" x2="12" y2="23"></line>
          <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
      `;

      mobileSearchBox.appendChild(mobileMicBtn);

      const mobileRecognition = new SpeechRecognition();
      mobileRecognition.continuous = false;
      mobileRecognition.lang = 'en-US';
      mobileRecognition.interimResults = false;
      mobileRecognition.maxAlternatives = 1;

      let isMobileListening = false;

      mobileMicBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isMobileListening) {
          mobileRecognition.stop();
        } else {
          try {
            mobileRecognition.start();
          } catch (err) {
            console.warn('Mobile voice recognition starting failed:', err);
          }
        }
      });

      mobileRecognition.onstart = () => {
        isMobileListening = true;
        mobileMicBtn.classList.add('is-listening');
        mobileSearchInput.placeholder = 'Listening...';
        mobileSearchInput.value = '';
      };

      mobileRecognition.onend = () => {
        isMobileListening = false;
        mobileMicBtn.classList.remove('is-listening');
        mobileSearchInput.placeholder = 'Search products...';
      };

      mobileRecognition.onerror = (event) => {
        console.warn('Mobile speech recognition error encountered:', event.error);
        isMobileListening = false;
        mobileMicBtn.classList.remove('is-listening');
        mobileSearchInput.placeholder = 'Search products...';
      };

      mobileRecognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const cleanText = transcript.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
        mobileSearchInput.value = cleanText;

        // If desktop search input exists, sync its value as well
        if (searchInput) {
          searchInput.value = cleanText;
        }

        // Handle page redirect or live filtering
        const grid = document.getElementById('productsGrid');
        if (grid) {
          executeSearch(cleanText);
          const burger = document.getElementById('burger');
          if (burger && burger.classList.contains('is-active')) {
            burger.click();
          }
        } else {
          window.location.href = `shop.html?q=${encodeURIComponent(cleanText)}`;
        }
      };
    }
  }

  // 4. On Page Load, check URL Search Query Param 'q' and trigger filtering automatically
  const urlParams = new URLSearchParams(window.location.search);
  const qParam = urlParams.get('q');
  if (qParam) {
    searchInput.value = qParam;
    
    // Defer slightly to allow components or async data lists to fully mount
    setTimeout(() => {
      executeSearch(qParam);
    }, 200);
  }
}
