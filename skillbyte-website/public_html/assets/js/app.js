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
      if (meta) meta.setAttribute('content', theme === 'dark' ? '#0a1420' : '#ffffff');
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
    window.matchMedia('(min-width: 68rem)').addEventListener('change', function (e) {
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
          // Reveal on entry, and also for anything already scrolled past.
          // Without the second condition, deep-linking to #work would leave
          // every section above it stuck at opacity 0 until scrolled back up.
          if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0 }
    );

    for (var i = 0; i < targets.length; i++) observer.observe(targets[i]);

    // Backstop. Content must never stay invisible because an observer
    // callback was missed — the bottom rootMargin in particular can leave
    // elements at the very end of the page untriggered. This sweeps anything
    // that has entered the viewport and removes itself once all are shown.
    var remaining = Array.prototype.slice.call(targets);
    var pending = false;

    function sweep() {
      pending = false;
      for (var i = remaining.length - 1; i >= 0; i--) {
        if (remaining[i].getBoundingClientRect().top < window.innerHeight) {
          remaining[i].classList.add('is-visible');
          remaining.splice(i, 1);
        }
      }
      if (!remaining.length) {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      }
    }

    function onScroll() {
      if (pending) return;
      pending = true;
      requestAnimationFrame(sweep);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
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

    // Stamp how long the visitor spent on the page. The handler treats a
    // sub-two-second submission as a bot. Left empty without JS, in which
    // case the server skips the check rather than blocking the visitor.
    var loadedAt = Date.now();
    var elapsed = form.querySelector('[name="elapsed"]');

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
      if (elapsed) {
        elapsed.value = String(Math.round((Date.now() - loadedAt) / 1000));
      }

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
     Site search

     Five pages do not justify a search index file, but a magnifying glass
     that does nothing is worse than no magnifying glass. So the icon opens a
     real filter over a small hand-maintained index of pages and sections.
     Add an entry here when you add a page.
     ------------------------------------------------------------------------ */

  var SEARCH_INDEX = [
    { t: 'Home', p: 'index.html', d: 'Digital work that ships — marketing, apps and websites' },
    { t: 'Services', p: 'services.html', d: 'Everything we do, and what you get' },
    { t: 'Digital Marketing & SEO', p: 'services.html#digital-marketing', d: 'Search, paid social and organic campaigns measured against revenue' },
    { t: 'Mobile App Development', p: 'services.html#mobile-apps', d: 'iOS and Android built for patchy data and mid-range devices' },
    { t: 'Website Development', p: 'services.html#web-development', d: 'Fast, accessible sites that load on a 3G connection' },
    { t: 'Branding, Social, Content & Training', p: 'services.html#more', d: 'The four services that usually come attached to a bigger project' },
    { t: 'Pricing and timelines', p: 'services.html', d: 'What projects cost, how long they take, who owns the code' },
    { t: 'Work', p: 'work.html', d: 'Case studies, each led by the result it produced' },
    { t: 'About', p: 'about.html', d: 'Our story, how we work, and the team' },
    { t: 'The team', p: 'about.html', d: 'Who you will actually be working with' },
    { t: 'Contact', p: 'contact.html', d: 'Start a project — we reply within one business day' }
  ];

  function initSearch() {
    var toggle = document.querySelector('[data-search-toggle]');
    var overlay = document.getElementById('site-search');
    if (!toggle || !overlay) return;

    var input = overlay.querySelector('#search-input');
    var list = overlay.querySelector('#search-results');
    var count = overlay.querySelector('[data-search-count]');
    var closeBtn = overlay.querySelector('[data-search-close]');
    var lastFocus = null;

    function links() {
      return list.querySelectorAll('a');
    }

    function render(query) {
      var q = query.trim().toLowerCase();
      var matches = q
        ? SEARCH_INDEX.filter(function (item) {
            return (item.t + ' ' + item.d).toLowerCase().indexOf(q) !== -1;
          })
        : SEARCH_INDEX;

      list.innerHTML = '';

      if (!matches.length) {
        var empty = document.createElement('li');
        empty.className = 'search-empty';
        empty.textContent = 'Nothing matches \u201C' + query.trim() + '\u201D.';
        list.appendChild(empty);
        if (count) count.textContent = 'No results';
        return;
      }

      matches.forEach(function (item) {
        var li = document.createElement('li');
        li.className = 'search-result';

        var a = document.createElement('a');
        a.href = item.p;

        var title = document.createElement('span');
        title.className = 'search-result__title';
        title.textContent = item.t;

        var meta = document.createElement('span');
        meta.className = 'search-result__meta';
        meta.textContent = item.d;

        a.appendChild(title);
        a.appendChild(meta);
        li.appendChild(a);
        list.appendChild(li);
      });

      if (count) {
        count.textContent =
          matches.length + (matches.length === 1 ? ' result' : ' results') + ' available';
      }
    }

    /* Roving focus across the real anchors. Moving actual DOM focus (rather
       than painting an aria-selected state) means Enter, middle-click and
       "open in new tab" all behave the way they do anywhere else. */
    function focusAt(index) {
      var items = links();
      if (!items.length) return;
      if (index < 0) {
        input.focus();
        return;
      }
      var i = index % items.length;
      items[i].focus();
      items[i].scrollIntoView({ block: 'nearest' });
    }

    function currentIndex() {
      var items = links();
      for (var i = 0; i < items.length; i++) {
        if (items[i] === document.activeElement) return i;
      }
      return -1;
    }

    function open() {
      lastFocus = document.activeElement;
      overlay.hidden = false;
      document.body.classList.add('search-open');
      toggle.setAttribute('aria-expanded', 'true');
      requestAnimationFrame(function () {
        overlay.classList.add('is-open');
      });
      input.value = '';
      render('');
      input.focus();
    }

    function close() {
      overlay.classList.remove('is-open');
      document.body.classList.remove('search-open');
      toggle.setAttribute('aria-expanded', 'false');
      window.setTimeout(function () {
        overlay.hidden = true;
      }, 280);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    toggle.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });

    input.addEventListener('input', function () {
      render(this.value);
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        focusAt(0);
      } else if (e.key === 'Enter') {
        var first = links()[0];
        if (first) {
          e.preventDefault();
          window.location.href = first.getAttribute('href');
        }
      }
    });

    list.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      focusAt(currentIndex() + (e.key === 'ArrowDown' ? 1 : -1));
    });

    /* Focus trap: the overlay is modal, so Tab must not wander behind it. */
    overlay.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var focusable = overlay.querySelectorAll('input, button, a[href]');
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !overlay.hidden) {
        close();
        return;
      }
      // Cmd/Ctrl+K opens search from anywhere, the convention people expect
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (overlay.hidden) open();
        else close();
      }
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
    initSearch();
    initYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
