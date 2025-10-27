// js/scroll-animations.js
// Safe, reusable IntersectionObserver-based scroll animation setup.
// Include this once on every page, after your DOM content is available (defer or at end of body).

(function () {
  'use strict';

  // Only create one observer instance per page
  let observer;

  function createObserver(options = { root: null, rootMargin: '0px', threshold: 0.1 }) {
    if (observer) return observer;
    if (!('IntersectionObserver' in window)) {
      // Fallback: add 'animate' immediately if no IntersectionObserver support
      return {
        observe(el) {
          if (el && !el.classList.contains('animate')) el.classList.add('animate');
        },
        unobserve() {},
      };
    }

    observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate');
          obs.unobserve(entry.target);
        }
      });
    }, options);

    return observer;
  }

  function observeElements(elements) {
    if (!elements) return;
    const obs = createObserver();
    // elements may be NodeList or array
    Array.from(elements).forEach(el => {
      if (el) obs.observe(el);
    });
  }

  // Generic helper to query and observe a list of selectors
  function observeSelectors(selectors = []) {
    const nodes = selectors.flatMap(sel => {
      const list = document.querySelectorAll(sel);
      return list ? Array.from(list) : [];
    });
    observeElements(nodes);
  }

  // Section-specific setups, each checks for presence before doing anything
  function setupAboutAnimations() {
    const sel = '.about-section';
    if (!document.querySelector(sel)) return;
    observeSelectors([
      '.about-section h1',
      '.about-section h2',
      '.about-section p'
    ]);
  }

  function setupGrantsAnimations() {
    if (!document.querySelector('.grants-projects')) return;
    observeSelectors([
      '.grants-projects .title_header',
      '.grants-projects .highlight-header',
      '.grants-projects .button_see_all',
      '.grants_card_light',
      '.grants_card_dark'
    ]);
  }

  function setupPublicationsAnimations() {
    if (!document.querySelector('.publications')) return;
    observeSelectors([
      '.publications .title_header',
      '.publications .highlight-header',
      '.publications .button_see_all',
      '.publications_card',
      '.publications_wrapper > i.ri-arrow-left-s-line',
      '.publications_wrapper > i.ri-arrow-right-s-line'
    ]);

    const cardContainer = document.querySelector('.publications_card_container');
    const container = document.querySelector('.publications_card');
    const leftArrow = document.querySelector('.publications_wrapper > i.ri-arrow-left-s-line');
    const rightArrow = document.querySelector('.publications_wrapper > i.ri-arrow-right-s-line');

    if (cardContainer && container && leftArrow && rightArrow) {
      // calculate scroll amount based on card width, guard against NaN
      const scrollAmount = Math.max(0, Math.round(container.clientWidth * 1.1 + 7));
      leftArrow.addEventListener('click', () => cardContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' }));
      rightArrow.addEventListener('click', () => cardContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' }));
    }
  }

  function setupNewsAnimations() {
    if (!document.querySelector('.news')) return;
    observeSelectors([
      '.news .title_header',
      '.news .highlight-header',
      '.news .see_all',
      '.news_card'
    ]);
  }

  function setupPartnersAnimations() {
    if (!document.querySelector('.partners_and_collaborators')) return;
    observeSelectors([
      '.partners_and_collaborators .title_header',
      '.partners_and_collaborators .highlight-header',
      '.logo-track',
      '.logo-track img'
    ]);
  }

  function setupFooterAnimations() {
    if (!document.querySelector('.contact_content') && !document.querySelector('footer_nav')) return;
    observeSelectors([
      '.contact_content h1',
      '.contact_content h2',
      '.contact_content h3',
      '.divider',
      '.social_icons',
      '.footer_nav',
      '.copyright'
    ]);
  }

  function setupOrganizationChartPageAnimations() {
    if (!document.querySelector('.title_orgchart') && !document.querySelector('.content') && !document.querySelector('.organization-card-container')) return;
    observeSelectors([
      '.title_orgchart h1',
      '.content_orgchart h2',
      '.organization-card',
      '.member-organization-card',
      '.member-organization-card-last'
    ]);
  }

  function setupNewPageAnimations() {
    if (!document.querySelector('.new-page')) return;
    observeSelectors([
      '.new-page .title_header',
      '.new-page .highlight-header',
      '.new-page .button_see_all',
      '.new-page .new_card'
    ]);
  }

  function setupNewsPageAnimations() {
    if (!document.querySelector('.news-page')) return;
    observeSelectors([
      '.title_header'
    ]);
  }

  // Public init function, safe to call multiple times
  function initScrollAnimations() {
    // Create observer with desired options
    createObserver({ root: null, rootMargin: '0px', threshold: 0.1 });

    // Call each setup. They will no-op if the section is absent.
    setupAboutAnimations();
    setupGrantsAnimations();
    setupPublicationsAnimations();
    setupNewsAnimations();
    setupPartnersAnimations();
    setupFooterAnimations();
    setupNewPageAnimations();
    setupOrganizationChartPageAnimations();
    setupNewsPageAnimations();
  }

  // Auto init on DOMContentLoaded if script included with defer or at end of body
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrollAnimations);
  } else {
    // If document already loaded, init immediately
    initScrollAnimations();
  }

  // Expose for page-specific manual usage
  window.initScrollAnimations = initScrollAnimations;

})();
