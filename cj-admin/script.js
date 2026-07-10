/**
 * @file cj-admin/script.js
 * @description Frontend controller for the CJDropshipping Product Importer.
 * Handles API fetch requests, read-only constraints, active price changes, 
 * and persistent catalog simulation saving in localStorage.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- Elegant Theme Toggle Logic ---
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  if (themeToggleBtn) {
    const currentTheme = localStorage.getItem('pawdrop_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);

    themeToggleBtn.addEventListener('click', () => {
      let theme = document.documentElement.getAttribute('data-theme') || 'dark';
      const newTheme = theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('pawdrop_theme', newTheme);
      updateThemeIcon(newTheme);
    });
  }

  function updateThemeIcon(theme) {
    if (!themeToggleBtn) return;
    if (theme === 'light') {
      themeToggleBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
      `;
    } else {
      themeToggleBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      `;
    }
  }

  // 1. Selector Cache
  const productIdInput = document.getElementById('productIdInput');
  const fetchProductBtn = document.getElementById('fetchProductBtn');
  const btnText = document.getElementById('btnText');
  const btnLoader = document.getElementById('btnLoader');

  const productNameInput = document.getElementById('productNameInput');
  const productImageInput = document.getElementById('productImageInput');
  const productDescInput = document.getElementById('productDescInput');
  const productPriceInput = document.getElementById('productPriceInput');

  const saveProductBtn = document.getElementById('saveProductBtn');
  const clearFormBtn = document.getElementById('clearFormBtn');

  const placeholderView = document.getElementById('placeholderView');
  const liveCardView = document.getElementById('liveCardView');
  const cardImage = document.getElementById('cardImage');
  const cardTitle = document.getElementById('cardTitle');
  const cardDesc = document.getElementById('cardDesc');
  const cardPid = document.getElementById('cardPid');
  const cardPrice = document.getElementById('cardPrice');

  const toastBox = document.getElementById('toastBox');

  // Currently loaded item state
  let currentFetchedProduct = null;

  // 2. Event Listeners
  fetchProductBtn.addEventListener('click', handleProductRetrieval);
  productPriceInput.addEventListener('input', handlePriceAdjustment);
  saveProductBtn.addEventListener('click', handleProductSaving);
  clearFormBtn.addEventListener('click', resetFormState);

  // Allow enter key in search box
  productIdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleProductRetrieval();
    }
  });

  /**
   * Performs backend network request to fetch CJDropshipping product data securely
   */
  async function handleProductRetrieval() {
    const pid = productIdInput.value.trim();

    if (!pid) {
      showToast('Please specify a valid Product ID first.', 'error');
      return;
    }

    // Set UI Loading State
    toggleButtonLoading(true);
    resetFormValuesOnly();

    try {
      console.log(`[CJ-Admin Gateway] Requesting product metadata via backend proxy for ID: ${pid}`);
      
      const response = await fetch('/api/fetch-cj-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ pid })
      });

      if (!response.ok) {
        throw new Error(`Upstream server responded with code ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Successful response - bind records
        currentFetchedProduct = result;

        // Populate Form Fields
        productNameInput.value = result.Title || '';
        productImageInput.value = result["Image URL"] || result.ImageUrl || '';
        productDescInput.value = result.Description || '';
        
        // Price should be prefilled and remains editable
        const initialPrice = parseFloat(result.Price || 0);
        productPriceInput.value = initialPrice.toFixed(2);
        productPriceInput.disabled = false; // Enabled for editing as required

        // Setup the read-only states strictly
        productNameInput.readOnly = true;
        productImageInput.readOnly = true;
        productDescInput.readOnly = true;

        // Update Visual Live Preview Card on the right
        cardImage.src = result["Image URL"] || result.ImageUrl || '';
        cardTitle.textContent = result.Title || 'No Title Available';
        cardDesc.textContent = result.Description || 'No description extracted.';
        cardPid.textContent = `PID: ${pid}`;
        cardPrice.textContent = `$${initialPrice.toFixed(2)}`;

        // Show/Hide card view states
        placeholderView.style.display = 'none';
        liveCardView.style.display = 'flex';
        
        // Remove and re-add the animation class to trigger/re-trigger the animation successfully on each fetch
        liveCardView.classList.remove('animate-faded-zoom');
        void liveCardView.offsetWidth; // Force a DOM reflow
        liveCardView.classList.add('animate-faded-zoom');

        // Enable save button
        saveProductBtn.disabled = false;

        showToast(`Successfully synchronized product specs! Price is open for adjustment.`, 'success');
      } else {
        throw new Error(result.message || 'API query failed.');
      }

    } catch (error) {
      console.error('[CJ-Admin Network Failure]', error);
      showToast(`Sync Failed: ${error.message || error}`, 'error');
      
      // Populate fields with error details so it's not left empty
      productNameInput.value = `Failed to fetch: ${pid}`;
      productImageInput.value = 'N/A';
      productDescInput.value = error.message || 'An error occurred while querying the CJDropshipping gateway. Please verify the Product ID or API credential limits.';
      productPriceInput.value = '';
      productPriceInput.disabled = true;

      resetPreviewCard();
    } finally {
      toggleButtonLoading(false);
    }
  }

  /**
   * Refreshes the price preview on the card on active typing
   */
  function handlePriceAdjustment(e) {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val >= 0) {
      cardPrice.textContent = `$${val.toFixed(2)}`;
      if (currentFetchedProduct) {
        currentFetchedProduct.Price = val;
      }
    } else {
      cardPrice.textContent = `$0.00`;
    }
  }

  /**
   * Records the synced product persistently inside localStorage so that 
   * the primary pet-shop catalogs display and load the merchandise in real-time.
   */
  function handleProductSaving() {
    if (!currentFetchedProduct) {
      showToast('No active product data loaded is available to save.', 'error');
      return;
    }

    const finalPrice = parseFloat(productPriceInput.value);
    if (isNaN(finalPrice) || finalPrice <= 0) {
      showToast('Please enter a valid retail price above $0.00.', 'error');
      return;
    }

    try {
      const savedList = localStorage.getItem('pawdrop_imported_products');
      let parsedList = [];
      if (savedList) {
        parsedList = JSON.parse(savedList);
      }

      // Check for duplicate custom pid
      const cleanPid = productIdInput.value.trim();
      const existingIndex = parsedList.findIndex(item => item.cj_pid === cleanPid);

      // Map imported parameters into standard Pawdrop product schema structure
      // ID starts at 101+ to prevent conflicts with native products (IDs 1-6)
      const mockReviewCount = Math.floor(Math.random() * 15) + 3;
      const mockRating = parseFloat((4.2 + (Math.random() * 0.7)).toFixed(1));
      
      const targetId = existingIndex !== -1 ? parsedList[existingIndex].id : 101 + parsedList.length;

      const productRecord = {
        id: targetId,
        cj_pid: cleanPid,
        name: productNameInput.value,
        img: productImageInput.value,
        desc: productDescInput.value,
        price: finalPrice,
        category: 'IMPORTED',
        sold: Math.floor(Math.random() * 80) + 10,
        reviewsCount: mockReviewCount,
        rating: mockRating,
        importedDate: new Date().toISOString()
      };

      if (existingIndex !== -1) {
        // Update product record
        parsedList[existingIndex] = productRecord;
      } else {
        // Insert product record
        parsedList.push(productRecord);
      }

      // Commit to local store configuration
      localStorage.setItem('pawdrop_imported_products', JSON.stringify(parsedList));

      // Synchronize back with product map array if present on root window context
      if (typeof window !== 'undefined' && window.parent) {
         try {
           window.parent.postMessage({
             type: 'PAWDROP_REFRESH_INVENTORY',
             product: productRecord
           }, '*');
         } catch(e){}
      }

      showToast(`CJ Product "${productRecord.name}" successfully syndicated and saved to Pawdrop active catalog inventory!`, 'success');
      
      // Keep state but emphasize successful sync
      saveProductBtn.innerText = "Updated & Saved ✓";
      saveProductBtn.classList.add('btn--outline');
      setTimeout(() => {
        saveProductBtn.innerText = "Save Product & Track Sync";
         saveProductBtn.classList.remove('btn--outline');
      }, 3000);

    } catch (err) {
      console.error(err);
      showToast('Could not save product information locally.', 'error');
    }
  }

  /**
   * Resets form values and locks control indicators
   */
  function resetFormState() {
    productIdInput.value = '';
    resetFormValuesOnly();
    resetPreviewCard();
    currentFetchedProduct = null;
    showToast('Admin importer workspace cleared.', 'default');
  }

  function resetFormValuesOnly() {
    productNameInput.value = '';
    productImageInput.value = '';
    productDescInput.value = '';
    productPriceInput.value = '';
    productPriceInput.disabled = true;

    productNameInput.readOnly = true;
    productImageInput.readOnly = true;
    productDescInput.readOnly = true;

    saveProductBtn.disabled = true;
  }

  function resetPreviewCard() {
    placeholderView.style.display = 'flex';
    liveCardView.style.display = 'none';
    cardImage.src = '';
    cardTitle.textContent = '';
    cardDesc.textContent = '';
    cardPid.textContent = 'PID: -';
    cardPrice.textContent = '$0.00';
  }

  function toggleButtonLoading(isLoading) {
    if (isLoading) {
      btnText.style.display = 'none';
      btnLoader.style.display = 'inline-block';
      fetchProductBtn.disabled = true;
    } else {
      btnText.style.display = 'inline-block';
      btnLoader.style.display = 'none';
      fetchProductBtn.disabled = false;
    }
  }

  /**
   * Renders modern responsive visual alert toasts
   */
  function showToast(message, type = 'default') {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    
    // Choose status indicator
    let indicator = '🔵';
    if (type === 'success') indicator = '🟢';
    if (type === 'error') indicator = '🔴';

    toast.innerHTML = `
      <span style="font-size:16px;">${indicator}</span>
      <div>${message}</div>
    `;

    toastBox.appendChild(toast);

    // auto dismiss
    setTimeout(() => {
      toast.style.animation = 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards';
      setTimeout(() => {
        if (toast.parentNode) {
          toastBox.removeChild(toast);
        }
      }, 350);
    }, 4500);
  }
});
