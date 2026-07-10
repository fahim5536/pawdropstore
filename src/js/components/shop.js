import { renderProducts } from './cart.js';
import { products } from '../data/products.js';
import { gsap } from '../core/gsap.js';

export function initShop() {
  const shopFilters = document.getElementById('shopFilters');
  const shopSort = document.getElementById('shopSort');
  
  // Custom Controls elements
  const priceRangeSlider = document.getElementById('priceRangeSlider');
  const sliderValue = document.getElementById('sliderValue');
  const priceCheckboxes = document.querySelectorAll('.price-checkbox');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');
  const noResultsMsg = document.getElementById('noResultsMsg');
  const productsGrid = document.getElementById('productsGrid');
  const noResultsResetBtn = document.getElementById('noResultsResetBtn');

  // Mobile sidebar controls
  const mobileFilterToggle = document.getElementById('mobileFilterToggle');
  const shopSidebar = document.getElementById('shopSidebar');
  const closeSidebarBtn = document.getElementById('closeSidebarBtn');

  if (!shopFilters || !shopSort) return;

  let currentCategory = 'all';
  let currentSort = 'featured';
  let maxPrice = 50;
  let checkedPriceRanges = [];

  const filterBtns = shopFilters.querySelectorAll('.filter-btn');

  // Check URL parameters for category filtering
  const urlParams = new URLSearchParams(window.location.search);
  const catParam = urlParams.get('category');
  if (catParam) {
    currentCategory = catParam;
    filterBtns.forEach(b => {
      b.classList.remove('is-active');
      if (b.dataset.filter === currentCategory || b.dataset.filter.includes(currentCategory)) {
        b.classList.add('is-active');
      }
    });
  }

  // Handle URL price limit if available
  const priceParam = urlParams.get('price');
  if (priceParam) {
    const val = parseFloat(priceParam);
    if (!isNaN(val) && val >= 10 && val <= 50) {
      maxPrice = val;
      if (priceRangeSlider) {
        priceRangeSlider.value = val;
      }
      if (sliderValue) {
        sliderValue.textContent = val.toFixed(2);
      }
    }
  }

  function updateGrid() {
    let filtered = [...products];

    // 1. Apply category filter
    if (currentCategory !== 'all') {
      filtered = filtered.filter(p => 
        p.category.toLowerCase().includes(currentCategory.toLowerCase()) ||
        p.name.toLowerCase().includes(currentCategory.toLowerCase())
      );
    }

    // 2. Apply max price slider filter
    filtered = filtered.filter(p => p.price <= maxPrice);

    // 3. Apply checkbox ranges
    if (checkedPriceRanges.length > 0) {
      filtered = filtered.filter(p => {
        return checkedPriceRanges.some(range => {
          if (range === 'under-20') return p.price < 20;
          if (range === '20-25') return p.price >= 20 && p.price <= 25;
          if (range === 'over-25') return p.price > 25;
          return true;
        });
      });
    }

    // 4. Apply sorting
    if (currentSort === 'price-low') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (currentSort === 'price-high') {
      filtered.sort((a, b) => b.price - a.price);
    } else {
      const originalOrder = new Map(products.map((p, i) => [p.id, i]));
      filtered.sort((a, b) => originalOrder.get(a.id) - originalOrder.get(b.id));
    }

    // Toggle reset filters button visibility
    const isFiltered = currentCategory !== 'all' || maxPrice < 50 || checkedPriceRanges.length > 0;
    if (resetFiltersBtn) {
      resetFiltersBtn.style.display = isFiltered ? 'block' : 'none';
    }

    // Display empty error message or matching list
    if (filtered.length === 0) {
      if (noResultsMsg) noResultsMsg.style.display = 'block';
      if (productsGrid) productsGrid.style.display = 'none';
      renderProducts([]);
    } else {
      if (noResultsMsg) noResultsMsg.style.display = 'none';
      if (productsGrid) productsGrid.style.display = 'grid';

      // Grid fade out/in animation
      const grid = document.getElementById('productsGrid');
      if (grid) {
        gsap.to(grid, { 
          opacity: 0, 
          duration: 0.25, 
          onComplete: () => {
            renderProducts(filtered);
            gsap.to(grid, { opacity: 1, duration: 0.25 });
            
            if (window.ScrollTrigger) {
              window.ScrollTrigger.refresh();
            }
          }
        });
      }
    }
  }

  // --- Category buttons listeners ---
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      currentCategory = btn.dataset.filter;
      updateGrid();
    });
  });

  // --- Sort listener ---
  shopSort.addEventListener('change', (e) => {
    currentSort = e.target.value;
    updateGrid();
  });

  // --- Slider listeners ---
  if (priceRangeSlider) {
    priceRangeSlider.addEventListener('input', (e) => {
      maxPrice = parseFloat(e.target.value);
      if (sliderValue) {
        sliderValue.textContent = maxPrice.toFixed(2);
      }
      updateGrid();
    });
  }

  // --- Checkbox listeners ---
  priceCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      checkedPriceRanges = Array.from(priceCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
      updateGrid();
    });
  });

  // --- Reset actions ---
  function clearAllFilters() {
    // Reset category
    currentCategory = 'all';
    filterBtns.forEach(b => {
      b.classList.remove('is-active');
      if (b.dataset.filter === 'all') b.classList.add('is-active');
    });

    // Reset slider
    maxPrice = 50;
    if (priceRangeSlider) priceRangeSlider.value = 50;
    if (sliderValue) sliderValue.textContent = "50.00";

    // Reset checkboxes
    priceCheckboxes.forEach(cb => {
      cb.checked = false;
    });
    checkedPriceRanges = [];

    // Reset sort
    currentSort = 'featured';
    if (shopSort) shopSort.value = 'featured';

    // Trigger grid update
    updateGrid();
  }

  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', clearAllFilters);
  }
  if (noResultsResetBtn) {
    noResultsResetBtn.addEventListener('click', clearAllFilters);
  }

  // --- Mobile Drawer Controls ---
  if (mobileFilterToggle && shopSidebar) {
    mobileFilterToggle.addEventListener('click', () => {
      shopSidebar.classList.add('is-active');
    });
  }
  if (closeSidebarBtn && shopSidebar) {
    closeSidebarBtn.addEventListener('click', () => {
      shopSidebar.classList.remove('is-active');
    });
  }

  // Global listener for currency changes
  window.addEventListener('re-render-prices', updateGrid);

  // Global listener for real-time Firebase products update
  window.addEventListener('pawdrop-products-updated', () => {
    try {
      updateGrid();
    } catch (e) {
      console.error("Failed to update shop grid on products update event:", e);
    }
  });

  // Initialize with initial render
  if (catParam) {
    // If we have a category in the parameter, start with it
    let filtered = [...products];
    if (currentCategory !== 'all') {
      filtered = filtered.filter(p => 
        p.category.toLowerCase().includes(currentCategory.toLowerCase()) ||
        p.name.toLowerCase().includes(currentCategory.toLowerCase())
      );
    }
    renderProducts(filtered);
  } else {
    // Otherwise render everything by default
    renderProducts(products);
  }
}

