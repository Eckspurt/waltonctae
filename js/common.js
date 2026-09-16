/*
  Shared header/footer injection so nav markup lives in one
  place. Runs on every page via <div id="site-header"></div>
  and <div id="site-footer"></div> placeholders.

  Fetches department content once and returns it so callers
  (index.html, department.html) can reuse it instead of
  fetching again.
*/

async function renderSiteChrome(activeSlug) {
  const header = document.getElementById("site-header");
  const footer = document.getElementById("site-footer");
  const allDepts = await loadAllDepartments();

  if (header) {
    const navLinks = CTAE_DEPARTMENTS.map((slug) => {
      const dept = allDepts[slug];
      const isActive = slug === activeSlug ? " active" : "";
      return `<a class="nav-link${isActive}" href="department.html?dept=${slug}">${dept.name}</a>`;
    }).join("");

    header.innerHTML = `
      <div class="nav-wrap">
        <a class="nav-brand" href="index.html">
          <img class="nav-brand-mark" src="/images/uploads/logo.png" alt="Walton CTAE logo">
          <span class="nav-brand-text">Walton CTAE</span>
        </a>
        <button class="nav-toggle" id="nav-toggle" aria-label="Toggle navigation" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
        <nav class="nav-links" id="nav-links">
          <a class="nav-link${activeSlug ? "" : " active"}" href="index.html">Home</a>
          ${navLinks}
          <a class="nav-icon-link" href="/admin/" title="Teacher Login" aria-label="Teacher Login">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="5" y="11" width="14" height="9" rx="2"></rect>
              <path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
            </svg>
            <span class="nav-icon-link-text">Teacher Login</span>
          </a>
        </nav>
      </div>
    `;

    const toggle = document.getElementById("nav-toggle");
    const links = document.getElementById("nav-links");
    if (toggle && links) {
      toggle.addEventListener("click", () => {
        const isOpen = links.classList.toggle("open");
        toggle.setAttribute("aria-expanded", String(isOpen));
      });
    }
  }

  if (footer) {
    const footerDeptSlugs = activeSlug ? [activeSlug] : CTAE_DEPARTMENTS;
    const teacherContactsHtml = footerDeptSlugs.map((slug) => {
      const dept = allDepts[slug];
      return (dept.teachers || [])
        .map(
          (t) => `
        <div class="footer-staff-item">
          <span class="footer-staff-name">${t.name}</span>
          <a class="footer-staff-email" href="mailto:${t.email}">${t.email}</a>
        </div>
      `
        )
        .join("");
    }).join("");

    footer.innerHTML = `
      <div class="footer-wrap">
        <div class="footer-col">
          <div class="footer-title">Contact</div>
          <p class="footer-text">Walton High School<br>1590 Bill Murdock Rd, Marietta, GA 30062<br>(770) 578-3225</p>
          <div class="footer-staff-grid">${teacherContactsHtml}</div>
        </div>
      </div>
      <div class="footer-bottom">© ${new Date().getFullYear()} Walton CTAE · Walton High School</div>
    `;
  }

  return allDepts;
}
