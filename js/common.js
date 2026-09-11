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
          <span class="nav-brand-mark">WHS</span>
          <span class="nav-brand-text">Walton CTAE</span>
        </a>
        <button class="nav-toggle" id="nav-toggle" aria-label="Toggle navigation" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
        <nav class="nav-links" id="nav-links">
          <a class="nav-link${activeSlug ? "" : " active"}" href="index.html">Home</a>
          ${navLinks}
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
    footer.innerHTML = `
      <div class="footer-wrap">
        <div class="footer-col">
          <div class="footer-title">Walton CTAE</div>
          <p class="footer-text">Career, Technical &amp; Agricultural Education at Walton High School.</p>
        </div>
        <div class="footer-col">
          <div class="footer-title">Pathways</div>
          <ul class="footer-links">
            ${CTAE_DEPARTMENTS.map(
              (slug) =>
                `<li><a href="department.html?dept=${slug}">${allDepts[slug].name}</a></li>`
            ).join("")}
          </ul>
        </div>
        <div class="footer-col">
          <div class="footer-title">Contact</div>
          <p class="footer-text">Walton High School<br>1590 Bill Murdock Rd, Marietta, GA 30062<br>(770) 578-3225</p>
        </div>
        <div class="footer-col">
          <div class="footer-title">Staff</div>
          <ul class="footer-links">
            <li><a href="/admin/">Teacher Login →</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">© ${new Date().getFullYear()} Walton CTAE · Walton High School</div>
    `;
  }

  return allDepts;
}
