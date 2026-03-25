(async function () {
try {
    const container = document.getElementById('site-navbar-placeholder');
    if (!container) throw new Error('Target container "site-navbar-placeholder" not found.');

    const resp = await fetch('assets/global_assets/navbar.html');
    if (!resp.ok) throw new Error('Navbar not found');
    const html = await resp.text();
    
    container.innerHTML = html;

    // load navbar script file
    const s = document.createElement('script');
    s.src = 'assets/global_assets/navbar.js';
    document.body.appendChild(s);

    // after script loads, wait one frame so the browser has rendered the injected HTML
    s.onload = () => {
      requestAnimationFrame(() => {
        if (window.initNavbar) window.initNavbar('nav-toggle', 'nav-menu');
      });
    };
} catch (err) {
    console.error('Failed to load navbar', err);
}
})();