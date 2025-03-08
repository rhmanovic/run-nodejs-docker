
document.addEventListener('DOMContentLoaded', () => {
  // Lazy loading background images
  const lazyBackgrounds = document.querySelectorAll('.lazy-bg');
  const bgObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const bg = entry.target;
        bg.style.backgroundImage = `url(${bg.dataset.bg})`;
        bg.classList.add('loaded');
        observer.unobserve(bg);
      }
    });
  });

  lazyBackgrounds.forEach(bg => bgObserver.observe(bg));
  // Lazy loading images
  const lazyImages = document.querySelectorAll('img.lazy');
  const clientLogos = document.querySelectorAll('.client-logo.lazy');
  clientLogos.forEach((logo, index) => {
    logo.style.setProperty('--delay', `${index * 0.2}s`);
  });
  
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const newImg = new Image();
        newImg.onload = () => {
          img.src = img.dataset.src;
          img.classList.add('loaded');
        };
        newImg.src = img.dataset.src;
        observer.unobserve(img);
      }
    });
  }, {
    rootMargin: '50px'
  });

  lazyImages.forEach(img => imageObserver.observe(img));

  // Animations
  const animatedElements = document.querySelectorAll('.fade-in, .slide-up');
  const animationObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, {
    threshold: 0.1
  });

  animatedElements.forEach(el => animationObserver.observe(el));
});
document.addEventListener('DOMContentLoaded', () => {
  const slideElements = document.querySelectorAll('.slide-left, .slide-right');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, {
    threshold: 0.1
  });

  slideElements.forEach(element => {
    observer.observe(element);
  });
});
