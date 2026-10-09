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

// Registration form: swap the placeholder for the Google Form iframe only when the visitor asks for it
// (button click, or any "Register Your Interest" link to #register, or landing on #register directly)
const formFacade = document.querySelector('.form-facade');

function loadRegistrationForm() {
  if (!formFacade || !formFacade.isConnected) return;
  const iframe = document.createElement('iframe');
  iframe.src = formFacade.dataset.formSrc;
  iframe.className = 'w-full rounded-xl';
  iframe.height = '700';
  iframe.setAttribute('frameborder', '0');
  iframe.title = 'NextStep Consultancy Registration Form';
  iframe.textContent = 'Loading form…';
  formFacade.replaceWith(iframe);
}

if (formFacade) {
  formFacade.querySelector('button').addEventListener('click', loadRegistrationForm);
  document.querySelectorAll('a[href="#register"]').forEach(link => link.addEventListener('click', loadRegistrationForm));
  if (location.hash === '#register') loadRegistrationForm();
}
