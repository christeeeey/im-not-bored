// ============================================================
// tea house — navigation
// ============================================================

/** @param {string} route */
export function setActiveNav(route) {
  const links = document.querySelectorAll('.nav-link');
  links.forEach((link) => {
    const isActive = link.dataset.route === route;
    link.classList.toggle('active', isActive);
    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}
