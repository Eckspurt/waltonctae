/*
  Walton CTAE — content loader
  ---------------------------------------------------------
  Page content lives in content/departments/<slug>.json —
  one file per discipline. Teachers edit these through the
  CMS at /admin/ (see admin/config.yml); the site just fetches
  the current JSON at page load. No HTML/JS editing required
  to update course info.

  Note: fetch() needs an http(s) origin, so this won't load
  content when a page is opened directly via file://. Preview
  through a local server (e.g. VS Code "Live Server") or the
  deployed Netlify site.
*/

const CTAE_DEPARTMENTS = [
  "broadcasting",
  "business",
  "computer-science",
  "engineering",
  "graphic-arts",
  "healthcare-science"
];

async function loadDepartment(slug) {
  const res = await fetch(`content/departments/${slug}.json`);
  if (!res.ok) {
    throw new Error(`Failed to load department content: ${slug}`);
  }
  const data = await res.json();
  data.slug = slug;
  return data;
}

async function loadAllDepartments() {
  const entries = await Promise.all(
    CTAE_DEPARTMENTS.map(async (slug) => [slug, await loadDepartment(slug)])
  );
  return Object.fromEntries(entries);
}

// Turns a course title into a URL-safe anchor id, e.g. "AP Computer Science A" -> "ap-computer-science-a"
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
