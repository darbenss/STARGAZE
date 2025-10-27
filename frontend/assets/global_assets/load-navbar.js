(async function () {
try {
    const resp = await fetch('assets/global_assets/navbar.html');
    if (!resp.ok) throw new Error('Navbar not found');
    const html = await resp.text();
    const container = document.getElementById('site-navbar-placeholder');
    container.innerHTML = html;

    // load navbar script file
    const s = document.createElement('script');
    s.src = 'assets/global_assets/navbar.js';
    s.defer = true;
    document.body.appendChild(s);

    // after script loads, ensure init is called (initNavbar is exposed)
    s.onload = () => {
      if (window.initNavbar) window.initNavbar('nav-toggle', 'nav-menu');
    };
} catch (err) {
    console.error('Failed to load navbar', err);
}
})();