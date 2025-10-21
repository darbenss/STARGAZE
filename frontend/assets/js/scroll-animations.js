document.addEventListener('DOMContentLoaded', function() {
    // Intersection Observer configuration
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };
  
    // Create observer to add 'animate' class when elements are visible
    const observer = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);
  
    // Helper function to observe elements if they exist
    function observeElements(elements) {
      elements.forEach(element => {
        if (element) observer.observe(element);
      });
    }
  
    // Grants & Projects section
    function setupGrantsAnimations() {
      const titleHeader = document.querySelector('.grants-projects .title_header');
      const highlightHeader = document.querySelector('.grants-projects .highlight-header');
      const seeAllButton = document.querySelector('.grants-projects .button_see_all');
      const cards = document.querySelectorAll('.grants_card_light, .grants_card_dark');
  
      observeElements([
        titleHeader,
        highlightHeader,
        seeAllButton,
        ...cards
      ]);
    }
  
    // Publications section
    function setupPublicationsAnimations() {
      const titleHeader = document.querySelector('.publications .title_header');
      const highlightHeader = document.querySelector('.publications .highlight-header');
      const seeAllButton = document.querySelector('.publications .button_see_all');
      const cards = document.querySelectorAll('.publications_card');
      const leftArrow = document.querySelector('.publications_wrapper > i.ri-arrow-left-s-line');
      const rightArrow = document.querySelector('.publications_wrapper > i.ri-arrow-right-s-line');
      const cardContainer = document.querySelector('.publications_card_container');
  
      observeElements([
        titleHeader,
        highlightHeader,
        seeAllButton,
        ...cards,
        leftArrow,
        rightArrow
      ]);
  
      if (cardContainer && leftArrow && rightArrow) {
        const scrollAmount = 250;
        leftArrow.addEventListener('click', () => {
          cardContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        });
        rightArrow.addEventListener('click', () => {
          cardContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        });
      }
    }
  
    // News section
    function setupNewsAnimations() {
      const titleHeader = document.querySelector('.news .title_header');
      const highlightHeader = document.querySelector('.news .highlight-header');
      const seeAllButton = document.querySelector('.news .see_all');
      const cards = document.querySelectorAll('.news_card');
  
      observeElements([
        titleHeader,
        highlightHeader,
        seeAllButton,
        ...cards
      ]);
    }
  
    // Partners & Collaborators and Contact Us sections
    function setupPartnersContactAnimations() {
      const partnersTitle = document.querySelector('.partners_and_collaborators .title_header');
      const partnersHighlight = document.querySelector('.partners_and_collaborators .highlight-header');
      const logoTrack = document.querySelector('.logo-track');
      const logos = document.querySelectorAll('.logo-track img');
      const contactH1 = document.querySelector('.contact_content h1');
      const contactH2 = document.querySelector('.contact_content h2');
      const contactH3s = document.querySelectorAll('.contact_content h3');
      const divider = document.querySelector('.divider');
      const socialIcons = document.querySelector('.social_icons');
      const footerNav = document.querySelector('.footer_nav');
      const copyright = document.querySelector('.copyright');
  
      observeElements([
        partnersTitle,
        partnersHighlight,
        logoTrack,
        ...logos,
        contactH1,
        contactH2,
        ...contactH3s,
        divider,
        socialIcons,
        footerNav,
        copyright
      ]);
    }
  
    // New page section (example)
    function setupNewPageAnimations() {
      const titleHeader = document.querySelector('.new-page .title_header');
      const highlightHeader = document.querySelector('.new-page .highlight-header');
      const seeAllButton = document.querySelector('.new-page .button_see_all');
      const cards = document.querySelectorAll('.new-page .new_card');
  
      observeElements([
        titleHeader,
        highlightHeader,
        seeAllButton,
        ...cards
      ]);
    }
  
    // Initialize animations for all sections
    setupGrantsAnimations();
    setupPublicationsAnimations();
    setupNewsAnimations();
    setupPartnersContactAnimations();
    setupNewPageAnimations(); // Add for new page
  });