export const CURRENCY_RATES = {
  USD: 1,
  EUR: 0.93,
  GBP: 0.81
};

export const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£'
};

import { safeStorage } from './core/storage.js';

let currentCurrency = safeStorage.getItem('pawdrop_currency') || 'USD';
let listeners = [];

export function getCurrency() {
  return currentCurrency;
}

export function setCurrency(currency) {
  if (CURRENCY_RATES[currency] && currency !== currentCurrency) {
    currentCurrency = currency;
    safeStorage.setItem('pawdrop_currency', currentCurrency);
    listeners.forEach(fn => fn(currency));
    
    // Trigger custom event for non-module scripts if needed
    window.dispatchEvent(new CustomEvent('currencychange', { detail: currency }));
  }
}

export function formatPrice(usdPrice) {
  const converted = usdPrice * CURRENCY_RATES[currentCurrency];
  return `${CURRENCY_SYMBOLS[currentCurrency]}${converted.toFixed(2)}`;
}

export function onCurrencyChange(fn) {
  listeners.push(fn);
}

// Bind to switchers automatically
document.addEventListener('DOMContentLoaded', () => {
  const switchers = document.querySelectorAll('.currency-switcher');
  switchers.forEach(s => {
    s.value = currentCurrency;
    s.addEventListener('change', (e) => {
      setCurrency(e.target.value);
    });
  });

  onCurrencyChange(currency => {
    switchers.forEach(s => {
      if (s.value !== currency) {
        s.value = currency;
      }
    });
  });
});
