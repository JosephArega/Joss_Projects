/* ==========================================================================
   SkillByte — site behaviour
   No dependencies. Every module is optional: if its markup is absent on a
   page, it simply doesn't run. Nothing here is required to read the content.
   ========================================================================== */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  /* ------------------------------------------------------------------------
     Theme toggle
     The initial theme is applied by a tiny inline script in <head> so there
     is no flash. This only handles user-initiated switching.
     ------------------------------------------------------------------------ */

  function initTheme() {
    var toggle = document.querySelector('[data-theme-toggle]');
    if (!toggle) return;

    var root = document.documentElement;
    var meta = document.querySelector('meta[name="theme-color"]');

    function currentTheme() {
      var explicit = root.getAttribute('data-theme');
      if (explicit) return explicit;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function sync(theme) {
      toggle.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
      toggle.setAttribute(
        'aria-label',
        theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
      );
      if (meta) meta.setAttribute('content', theme === 'dark' ? '#0e0e0d' : '#ffffff');
    }

    sync(currentTheme());

    toggle.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try {
        localStorage.setItem('skillbyte-theme', next);
      } catch (e) {
        /* private browsing — the choice just won't persist */
      }
      sync(next);
    });

    // Follow the OS if the visitor has never made an explicit choice
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
      var stored = null;
      try {
        stored = localStorage.getItem('skillbyte-theme');
      } catch (err) {}
      if (!stored) sync(e.matches ? 'dark' : 'light');
    });
  }

  /* ------------------------------------------------------------------------
     Mobile navigation
     ------------------------------------------------------------------------ */

  function initNav() {
    var toggle = document.querySelector('[data-nav-toggle]');
    var menu = document.getElementById('mobile-menu');
    if (!toggle || !menu) return;

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      menu.classList.toggle('is-open', open);
      document.body.classList.toggle('nav-open', open);
      if (open) {
        var first = menu.querySelector('a, button');
        if (first) first.focus({ preventScroll: true });
      }
    }

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });

    // Close if the viewport grows past the mobile breakpoint while open
    window.matchMedia('(min-width: 62rem)').addEventListener('change', function (e) {
      if (e.matches) setOpen(false);
    });
  }

  /* ------------------------------------------------------------------------
     Sticky header shadow
     ------------------------------------------------------------------------ */

  function initHeader() {
    var header = document.querySelector('.site-header');
    if (!header) return;

    // A zero-height sentinel above the header is cheaper and smoother than
    // listening to scroll events.
    var sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText = 'position:absolute;top:0;height:1px;width:1px;';
    document.body.prepend(sentinel);

    if (!('IntersectionObserver' in window)) return;

    new IntersectionObserver(
      function (entries) {
        header.classList.toggle('is-stuck', !entries[0].isIntersecting);
      },
      { threshold: 0 }
    ).observe(sentinel);
  }

  /* ------------------------------------------------------------------------
     Scroll reveals
     Skipped entirely when the browser supports native scroll-driven
     animations, or when the visitor prefers reduced motion.
     ------------------------------------------------------------------------ */

  function initReveals() {
    var targets = document.querySelectorAll('.reveal, .process__step');
    if (!targets.length) return;

    function showAll() {
      for (var i = 0; i < targets.length; i++) targets[i].classList.add('is-visible');
    }

    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      showAll();
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.12 }
    );

    for (var i = 0; i < targets.length; i++) observer.observe(targets[i]);
  }

  /* ------------------------------------------------------------------------
     Scroll progress bar — fallback only.
     Browsers with animation-timeline: scroll() drive this in CSS instead.
     ------------------------------------------------------------------------ */

  function initScrollProgress() {
    var bar = document.querySelector('.scroll-progress__bar');
    if (!bar) return;
    if (CSS && CSS.supports && CSS.supports('animation-timeline', 'scroll()')) return;

    var ticking = false;

    function update() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var ratio = max > 0 ? window.scrollY / max : 0;
      bar.style.setProperty('--scroll-progress', Math.min(1, Math.max(0, ratio)));
      ticking = false;
    }

    window.addEventListener(
      'scroll',
      function () {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true }
    );

    update();
  }

  /* ------------------------------------------------------------------------
     Section rail — marks the section currently in view
     ------------------------------------------------------------------------ */

  function initSectionRail() {
    var rail = document.querySelector('.section-rail');
    if (!rail || !('IntersectionObserver' in window)) return;

    var items = rail.querySelectorAll('.section-rail__item');
    var sections = [];

    for (var i = 0; i < items.length; i++) {
      var id = items[i].getAttribute('href');
      if (!id || id.charAt(0) !== '#') continue;
      var section = document.querySelector(id);
      if (section) sections.push({ el: section, link: items[i] });
    }

    if (!sections.length) return;

    function setCurrent(link) {
      for (var i = 0; i < items.length; i++) {
        items[i].setAttribute('aria-current', items[i] === link ? 'true' : 'false');
      }
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          for (var i = 0; i < sections.length; i++) {
            if (sections[i].el === entry.target) setCurrent(sections[i].link);
          }
        });
      },
      // A band across the middle of the viewport: whichever section crosses
      // it is "current". Avoids two sections fighting near the edges.
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    );

    for (var j = 0; j < sections.length; j++) observer.observe(sections[j].el);
  }

  /* ------------------------------------------------------------------------
     Card cursor spotlight — pointer devices only
     ------------------------------------------------------------------------ */

  function initSpotlight() {
    if (!finePointer.matches || reduceMotion.matches) return;
    var cards = document.querySelectorAll('.card--spotlight');
    if (!cards.length) return;

    function move(e) {
      var rect = this.getBoundingClientRect();
      this.style.setProperty('--mx', ((e.clientX - rect.left) / rect.width) * 100 + '%');
      this.style.setProperty('--my', ((e.clientY - rect.top) / rect.height) * 100 + '%');
    }

    for (var i = 0; i < cards.length; i++) {
      cards[i].addEventListener('pointermove', move);
    }
  }

  /* ------------------------------------------------------------------------
     Hero — cursor-reactive glow
     ------------------------------------------------------------------------ */

  function initHeroGlow() {
    var hero = document.querySelector('[data-hero]');
    if (!hero || !finePointer.matches || reduceMotion.matches) return;

    var raf = null;
    var x = 50;
    var y = 40;

    hero.addEventListener(
      'pointermove',
      function (e) {
        var rect = hero.getBoundingClientRect();
        x = ((e.clientX - rect.left) / rect.width) * 100;
        y = ((e.clientY - rect.top) / rect.height) * 100;
        if (raf) return;
        raf = requestAnimationFrame(function () {
          hero.style.setProperty('--hx', x + '%');
          hero.style.setProperty('--hy', y + '%');
          raf = null;
        });
      },
      { passive: true }
    );
  }

  /* ------------------------------------------------------------------------
     Animated counters
     ------------------------------------------------------------------------ */

  function initCounters() {
    var counters = document.querySelectorAll('[data-count-to]');
    if (!counters.length) return;

    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      for (var i = 0; i < counters.length; i++) {
        counters[i].textContent = format(counters[i], parseFloat(counters[i].dataset.countTo));
      }
      return;
    }

    function format(el, value) {
      var decimals = parseInt(el.dataset.countDecimals || '0', 10);
      return (
        (el.dataset.countPrefix || '') +
        value.toFixed(decimals) +
        (el.dataset.countSuffix || '')
      );
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          observer.unobserve(el);

          var target = parseFloat(el.dataset.countTo);
          var duration = parseInt(el.dataset.countDuration || '1400', 10);
          var start = null;

          function step(now) {
            if (start === null) start = now;
            var progress = Math.min((now - start) / duration, 1);
            // easeOutExpo — fast then settles, reads as confident
            var eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            el.textContent = format(el, target * eased);
            if (progress < 1) requestAnimationFrame(step);
          }

          requestAnimationFrame(step);
        });
      },
      { threshold: 0.5 }
    );

    for (var j = 0; j < counters.length; j++) observer.observe(counters[j]);
  }

  /* ------------------------------------------------------------------------
     Accordion
     Uses grid-template-rows 0fr -> 1fr so panels animate to their natural
     height without measuring anything in JS.
     ------------------------------------------------------------------------ */

  function initAccordions() {
    var triggers = document.querySelectorAll('.accordion__trigger');

    for (var i = 0; i < triggers.length; i++) {
      triggers[i].addEventListener('click', function () {
        var expanded = this.getAttribute('aria-expanded') === 'true';
        var panel = document.getElementById(this.getAttribute('aria-controls'));
        var accordion = this.closest('.accordion');

        // Single-open behaviour when the accordion opts in
        if (!expanded && accordion && accordion.dataset.single === 'true') {
          var others = accordion.querySelectorAll('.accordion__trigger[aria-expanded="true"]');
          for (var j = 0; j < others.length; j++) {
            others[j].setAttribute('aria-expanded', 'false');
            var otherPanel = document.getElementById(others[j].getAttribute('aria-controls'));
            if (otherPanel) otherPanel.dataset.open = 'false';
          }
        }

        this.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        if (panel) panel.dataset.open = expanded ? 'false' : 'true';
      });
    }
  }

  /* ------------------------------------------------------------------------
     Contact form
     Progressive enhancement: the form posts normally to the PHP handler
     without JS. With JS we submit in the background and keep the visitor on
     the page, with inline validation messages.
     ------------------------------------------------------------------------ */

  function initContactForm() {
    var form = document.querySelector('[data-contact-form]');
    if (!form) return;

    var status = form.querySelector('[data-form-status]');
    var submit = form.querySelector('[type="submit"]');

    var messages = {
      name: 'Please tell us your name.',
      email: 'Please enter a valid email address.',
      message: 'Please tell us a little about your project.',
      service: 'Please choose what you need help with.'
    };

    function fieldError(field) {
      var wrapper = field.closest('.field');
      return wrapper ? wrapper.querySelector('.field__error') : null;
    }

    function setError(field, message) {
      var target = fieldError(field);
      field.setAttribute('aria-invalid', message ? 'true' : 'false');
      if (target) target.textContent = message || '';
    }

    function validate(field) {
      var value = (field.value || '').trim();

      if (field.hasAttribute('required') && !value) {
        setError(field, messages[field.name] || 'This field is required.');
        return false;
      }

      if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
        setError(field, messages.email);
        return false;
      }

      if (field.name === 'message' && value && value.length < 10) {
        setError(field, 'A little more detail helps us give you a useful reply.');
        return false;
      }

      setError(field, '');
      return true;
    }

    var fields = form.querySelectorAll('.field__control');

    for (var i = 0; i < fields.length; i++) {
      // Validate on blur, then live-correct once the visitor has been told
      fields[i].addEventListener('blur', function () {
        validate(this);
      });
      fields[i].addEventListener('input', function () {
        if (this.getAttribute('aria-invalid') === 'true') validate(this);
      });
    }

    function showStatus(type, text) {
      if (!status) return;
      status.className = 'form-status form-status--' + type;
      status.textContent = text;
      status.hidden = false;
    }

    form.addEventListener('submit', function (e) {
      var valid = true;
      var firstInvalid = null;

      for (var i = 0; i < fields.length; i++) {
        if (!validate(fields[i])) {
          valid = false;
          if (!firstInvalid) firstInvalid = fields[i];
        }
      }

      if (!valid) {
        e.preventDefault();
        showStatus('error', 'Please check the highlighted fields and try again.');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      // No fetch support: let the browser post the form the normal way and
      // land on the PHP handler's own response page.
      if (!window.fetch) return;

      e.preventDefault();

      if (submit) {
        submit.classList.add('is-loading');
        submit.disabled = true;
      }
      if (status) status.hidden = true;

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      })
        .then(function (response) {
          return response.json().catch(function () {
            throw new Error('bad-response');
          });
        })
        .then(function (data) {
          if (data && data.ok) {
            form.reset();
            showStatus(
              'success',
              data.message || "Thank you — your message is on its way. We'll reply within one business day."
            );
            if (status) status.focus();
          } else {
            showStatus(
              'error',
              (data && data.message) ||
                'Something went wrong sending your message. Please email us directly at hello@connectskillbyte.com.'
            );
          }
        })
        .catch(function () {
          showStatus(
            'error',
            'We could not reach the server. Please email us directly at hello@connectskillbyte.com.'
          );
        })
        .finally(function () {
          if (submit) {
            submit.classList.remove('is-loading');
            submit.disabled = false;
          }
        });
    });
  }

  /* ------------------------------------------------------------------------
     Current year in the footer
     ------------------------------------------------------------------------ */

  function initYear() {
    var nodes = document.querySelectorAll('[data-year]');
    var year = new Date().getFullYear();
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = year;
  }

  /* ------------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------------ */

  function init() {
    initTheme();
    initNav();
    initHeader();
    initReveals();
    initScrollProgress();
    initSectionRail();
    initSpotlight();
    initHeroGlow();
    initCounters();
    initAccordions();
    initContactForm();
    initYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
