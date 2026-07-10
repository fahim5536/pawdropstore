// Marquee component logic
export function initMarquees() {
  // Pure CSS marquee scroll, nothing complex required in JS
  // We can add hover pause effect or dynamic speed adjustments here if desired
  const marquees = document.querySelectorAll('.marquee');
  
  marquees.forEach(marquee => {
    const track = marquee.querySelector('.marquee__track');
    if (!track) return;
    
    // Duplicate children to ensure continuous seamless loop without empty gaps
    const originalContent = track.innerHTML;
    // Duplicate it twice to make sure it covers high-resolution screens
    track.innerHTML = originalContent + originalContent + originalContent + originalContent;
  });
}
