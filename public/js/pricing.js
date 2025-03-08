
document.addEventListener('DOMContentLoaded', function() {
  // Animation for elements with fade-in and slide-up classes
  const fadeElements = document.querySelectorAll('.fade-in');
  const slideElements = document.querySelectorAll('.slide-up');
  
  // Intersection Observer for fade-in elements
  const fadeObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  
  // Intersection Observer for slide-up elements
  const slideObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  
  // Observe all fade-in elements
  fadeElements.forEach(el => fadeObserver.observe(el));
  
  // Observe all slide-up elements
  slideElements.forEach(el => slideObserver.observe(el));
  
  // Add hover effect to pricing cards
  const pricingCards = document.querySelectorAll('.card');
  pricingCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-10px)';
      this.style.boxShadow = '0 15px 30px rgba(0, 0, 0, 0.1)';
    });
    
    card.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0)';
      this.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.05)';
    });
  });
});
