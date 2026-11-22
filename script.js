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

// "Admissions open" notice: slides in shortly after load, hides itself after ADMISSIONS_NOTICE.endsOn,
// and stays dismissed for a week per visitor. Update the fields below for the next intake round.
const ADMISSIONS_NOTICE = {
  id: '2027-summer',
  endsOn: '2027-01-15T23:59:59',
  dismissDays: 7
};

function showAdmissionsNotice() {
  if (new Date() > new Date(ADMISSIONS_NOTICE.endsOn)) return;
  const storageKey = `admissionsNoticeDismissed:${ADMISSIONS_NOTICE.id}`;
  try {
    const dismissedAt = Number(localStorage.getItem(storageKey));
    if (dismissedAt && Date.now() - dismissedAt < ADMISSIONS_NOTICE.dismissDays * 86400000) return;
  } catch (err) {
    // Storage blocked (private mode etc.), just show the notice.
  }

  // No point linking visitors to the page they're already on.
  const country = document.body.dataset.country;
  const links = [
    country !== 'germany' ? '<a href="index.html" class="admissions-notice-link">Germany →</a>' : '',
    country !== 'portugal' ? '<a href="portugal.html" class="admissions-notice-link">Portugal →</a>' : '',
    country !== 'canada' ? '<a href="canada.html" class="admissions-notice-link">Canada →</a>' : ''
  ].join('');

  const notice = document.createElement('aside');
  notice.className = 'admissions-notice';
  notice.setAttribute('role', 'status');
  notice.innerHTML = `
    <button type="button" class="admissions-notice-close" aria-label="Dismiss notice">✕</button>
    <p class="admissions-notice-title">📢 Admissions now open</p>
    <ul class="admissions-notice-text">
      <li><strong>Germany:</strong> Summer Semester 2027</li>
      <li><strong>Portugal:</strong> 2027/28 intake (only one intake a year)</li>
      <li><strong>Canada:</strong> Fall 2027</li>
    </ul>
    ${links ? `<div class="admissions-notice-links">${links}</div>` : ''}`;

  notice.querySelector('.admissions-notice-close').addEventListener('click', () => {
    notice.classList.remove('is-visible');
    try { localStorage.setItem(storageKey, String(Date.now())); } catch (err) {}
    setTimeout(() => notice.remove(), 300);
  });

  document.body.appendChild(notice);
  setTimeout(() => notice.classList.add('is-visible'), 1000);
}

showAdmissionsNotice();

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
