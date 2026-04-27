// Carl Berner Tannklinikk – multi-step bestilling

(function () {
  const form = document.getElementById('bookingForm');
  if (!form) return;

  const steps = Array.from(form.querySelectorAll('.booking-step'));
  const stepListItems = document.querySelectorAll('#stepList li');
  const totalSteps = 5;
  let current = 1;

  function goTo(n) {
    if (n < 1 || n > 6) return;
    current = n;
    steps.forEach(s => s.classList.toggle('active', Number(s.dataset.step) === n));
    stepListItems.forEach(li => {
      const stepNum = Number(li.dataset.step);
      li.classList.toggle('active', stepNum === n);
      li.classList.toggle('done', stepNum < n);
    });
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function validateStep(n) {
    const step = steps.find(s => Number(s.dataset.step) === n);
    if (!step) return true;
    const required = step.querySelectorAll('[required]');
    let ok = true;
    let firstInvalid = null;

    if (n === 1) {
      const t = form.querySelector('input[name="treatment"]:checked');
      if (!t) {
        ok = false;
        firstInvalid = step.querySelector('.option-card');
        flashError(step, 'Velg en behandling for å gå videre.');
      }
    } else {
      required.forEach(el => {
        if (!el.checkValidity()) {
          ok = false;
          el.classList.add('invalid');
          el.style.borderColor = 'var(--warning)';
          if (!firstInvalid) firstInvalid = el;
          el.addEventListener('input', function once() {
            el.style.borderColor = '';
            el.removeEventListener('input', once);
          });
        }
      });
    }

    if (firstInvalid && firstInvalid.focus) {
      try { firstInvalid.focus({ preventScroll: false }); } catch (e) {}
    }
    return ok;
  }

  function flashError(container, message) {
    let banner = container.querySelector('.error-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'error-banner';
      banner.style.cssText = 'background:#FFE9E0; color:#C04A28; padding:12px 16px; border-radius:10px; font-size:.9rem; margin-bottom:18px; border:1px solid #F4C9B5;';
      const desc = container.querySelector('.step-desc');
      if (desc) desc.after(banner); else container.prepend(banner);
    }
    banner.textContent = message;
    setTimeout(() => banner && banner.remove(), 4000);
  }

  function buildSummary() {
    const f = new FormData(form);
    const summary = document.getElementById('summary');
    if (!summary) return;

    const fmt = (s) => s ? s : '–';
    const fmtDate = (s) => {
      if (!s) return '–';
      const d = new Date(s);
      if (isNaN(d)) return s;
      return d.toLocaleDateString('no-NO', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    };

    const rows = [
      ['Behandling', fmt(f.get('treatment'))],
      ['Tannlege', fmt(f.get('dentist'))],
      ['Ønsket dato', fmtDate(f.get('preferred_date'))],
      ['Tidsrom', fmt(f.get('preferred_time'))],
      ['Alternativ dato', fmtDate(f.get('alt_date'))],
      ['Navn', `${fmt(f.get('firstname'))} ${fmt(f.get('lastname'))}`.trim()],
      ['Telefon', fmt(f.get('phone'))],
      ['E-post', fmt(f.get('email'))],
      ['Pasientstatus', fmt(f.get('patient_status'))]
    ];
    const msg = (f.get('message') || '').trim();
    if (msg) rows.push(['Beskjed', msg]);

    summary.innerHTML = rows.map(([k, v]) => (
      `<div class="summary-row"><div class="lbl">${k}</div><div class="val">${escapeHtml(v)}</div></div>`
    )).join('');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  }

  // Submit handler – bygger e-post via mailto
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const consent = form.querySelector('#consent');
    if (!consent.checked) {
      flashError(form.querySelector('[data-step="5"]'), 'Du må samtykke for at vi kan kontakte deg.');
      return;
    }

    const f = new FormData(form);
    const subject = `Timeforespørsel – ${f.get('firstname')} ${f.get('lastname')}`;
    const body = [
      'Hei Carl Berner Tannklinikk,',
      '',
      'Jeg ønsker å bestille time. Detaljer:',
      '',
      `• Behandling: ${f.get('treatment') || '–'}`,
      `• Tannlege: ${f.get('dentist') || '–'}`,
      `• Ønsket dato: ${f.get('preferred_date') || '–'}`,
      `• Tidsrom: ${f.get('preferred_time') || '–'}`,
      `• Alternativ dato: ${f.get('alt_date') || '–'}`,
      '',
      `• Navn: ${f.get('firstname') || ''} ${f.get('lastname') || ''}`.trim(),
      `• Telefon: ${f.get('phone') || '–'}`,
      `• E-post: ${f.get('email') || '–'}`,
      `• Fødselsdato: ${f.get('birthdate') || '–'}`,
      `• Pasient: ${f.get('patient_status') || '–'}`,
      '',
      `Beskjed:`,
      f.get('message') || '(ingen)',
      '',
      'Mvh,',
      `${f.get('firstname') || ''} ${f.get('lastname') || ''}`.trim()
    ].join('\n');

    const mailto = `mailto:carlbernertannklinikk@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // Åpne mailto i bakgrunnen
    const a = document.createElement('a');
    a.href = mailto;
    a.click();

    // Vis suksess-state uansett
    goTo(6);
    stepListItems.forEach(li => li.classList.add('done'));
  });

  // Step navigation buttons
  form.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'next') {
      if (!validateStep(current)) return;
      const nextStep = current + 1;
      if (nextStep === 5) buildSummary();
      goTo(nextStep);
    }
    if (action === 'prev') goTo(current - 1);
  });

  // Klikk på sidemeny-steg lar deg gå tilbake til besøkte steg
  stepListItems.forEach(li => {
    li.addEventListener('click', () => {
      const target = Number(li.dataset.step);
      if (target < current) goTo(target);
    });
    li.style.cursor = 'pointer';
  });

  // Date min = i dag
  const dateInputs = form.querySelectorAll('input[type="date"]:not([name="birthdate"])');
  const today = new Date().toISOString().split('T')[0];
  dateInputs.forEach(d => d.min = today);

  // Validering: fjern rød ramme ved input
  form.addEventListener('input', function (e) {
    if (e.target.matches('input, select, textarea')) {
      e.target.style.borderColor = '';
    }
  });
})();
