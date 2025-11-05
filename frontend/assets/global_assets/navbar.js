// global_assets/navbar.js
(function () {
  function initNavbar(toggleId = 'nav-toggle', navId = 'nav-menu') {
    const toggle = document.getElementById(toggleId);
    const nav = document.getElementById(navId);

    if (!toggle || !nav) return; // nothing to do if markup not present

    // toggle behavior
    const toggleMenu = () => {
      nav.classList.toggle('show-menu');
      toggle.classList.toggle('show-icon');

      const expanded = toggle.classList.contains('show-icon');
      toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    };

    // click or Enter/Space on toggle
    toggle.addEventListener('click', toggleMenu);
    toggle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleMenu();
      }
    });

    // close menu when clicking outside (mobile)
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (!nav.contains(target) && !toggle.contains(target) && nav.classList.contains('show-menu')) {
        nav.classList.remove('show-menu');
        toggle.classList.remove('show-icon');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });

    // close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('show-menu')) {
        nav.classList.remove('show-menu');
        toggle.classList.remove('show-icon');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });

    // Optional: add focus handling for dropdowns if needed
  }

  // Auto-init if navbar already in DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initNavbar());
  } else {
    initNavbar();
  }

  // Expose initNavbar for manual init after injection
  window.initNavbar = initNavbar;
})();