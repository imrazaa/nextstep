// Mobile menu toggle
const menuBtn = document.getElementById('menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

menuBtn.addEventListener('click', () => {
  mobileMenu.classList.toggle('hidden');
});

document.querySelectorAll('#mobile-menu a').forEach(link => {
  link.addEventListener('click', () => mobileMenu.classList.add('hidden'));
});

// Close any open country-switcher dropdown when clicking outside it
document.addEventListener('click', (e) => {
  document.querySelectorAll('.hero-country-dd[open], .country-float[open]').forEach(menu => {
    if (!menu.contains(e.target)) menu.removeAttribute('open');
  });
});

// Hero background decoration: randomly show one of two treatments (passport
// stamps or a flight-path route) per page load. The route map image is only
// fetched when it's actually chosen, so the other 50% of loads don't pay for it.
const heroDecorStamps = document.querySelector('.hero-decor-stamps');
const heroDecorRoute = document.querySelector('.hero-decor-route');
if (heroDecorStamps && heroDecorRoute) {
  const chosen = Math.random() < 0.5 ? heroDecorStamps : heroDecorRoute;
  if (chosen === heroDecorRoute) {
    const mapImg = heroDecorRoute.querySelector('.map-img');
    if (mapImg && mapImg.dataset.src) mapImg.src = mapImg.dataset.src;
  }
  chosen.classList.remove('hidden');
}

// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

// Contact form (Formspree) - AJAX submit with inline status message
const contactForm = document.getElementById('contact-form');
const formStatus = document.getElementById('form-status');

contactForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = new FormData(contactForm);

  formStatus.classList.remove('hidden', 'text-flagred', 'text-navy');
  formStatus.textContent = 'Sending…';
  formStatus.classList.add('text-navy');

  try {
    const response = await fetch(contactForm.action, {
      method: 'POST',
      body: data,
      headers: { 'Accept': 'application/json' }
    });

    if (response.ok) {
      formStatus.textContent = "Thanks! We've received your message and will reply by email soon.";
      formStatus.classList.remove('text-flagred');
      formStatus.classList.add('text-navy');
      contactForm.reset();
    } else {
      throw new Error('Submission failed');
    }
  } catch (err) {
    formStatus.textContent = 'Something went wrong. Please email us directly instead.';
    formStatus.classList.remove('text-navy');
    formStatus.classList.add('text-flagred');
  }
});
