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

// Clubs/organizations that show on every department page (e.g. NTHS),
// separate from content/departments/<slug>.json's own department-specific clubs.
async function loadSiteClubs() {
  const res = await fetch("content/clubs.json");
  if (!res.ok) {
    throw new Error("Failed to load sitewide clubs content");
  }
  const data = await res.json();
  return data.clubs || [];
}

// The school's staff directory — the single source of truth for a teacher's
// email/room/photo. Departments, courses, and clubs reference a teacher by
// their exact name (a plain string) rather than repeating their contact
// info, so editing someone's info here updates it everywhere they're listed.
async function loadSiteTeachers() {
  const res = await fetch("content/teachers.json");
  if (!res.ok) {
    throw new Error("Failed to load sitewide teachers content");
  }
  const data = await res.json();
  return data.teachers || [];
}

// Resolves a list of teacher-name strings against the staff directory,
// falling back to a bare name (no email/room/photo) if a name doesn't
// match any entry — e.g. a typo, or someone not yet added.
function resolveTeachers(names, teacherMap) {
  return (names || []).map(
    (name) => teacherMap.get(name) || { name, email: "", room: "", photo: null }
  );
}

// A department's pathways as a list (also accepts the older single "pathway"
// shape). A course that reappears in a later pathway is the same course: if its
// description, teachers, or video are blank there, it reuses the first
// occurrence's. Grades, prerequisites, and tag stay specific to each pathway.
function getPathways(dept) {
  const list =
    dept.pathways && dept.pathways.length ? dept.pathways : dept.pathway ? [dept.pathway] : [];
  const firstSeen = new Map();
  return list.map((p) => ({
    ...p,
    courses: (p.courses || []).map((c) => {
      const base = firstSeen.get(c.title);
      if (!base) {
        firstSeen.set(c.title, c);
        return c;
      }
      return {
        ...c,
        desc: c.desc || base.desc,
        teachers: c.teachers && c.teachers.length ? c.teachers : base.teachers || [],
        videoUrl: c.videoUrl || base.videoUrl
      };
    })
  }));
}

// Every distinct course across a department's pathways, in order of first
// appearance, with each pathway's version of it: [{ course, entries: [{ pathway, course }] }]
function buildCourseCatalog(pathways) {
  const byTitle = new Map();
  pathways.forEach((pathway) =>
    pathway.courses.forEach((course) => {
      if (!byTitle.has(course.title)) byTitle.set(course.title, { course, entries: [] });
      byTitle.get(course.title).entries.push({ pathway, course });
    })
  );
  return [...byTitle.values()];
}

// Groups a course's per-pathway entries by a value, so identical values can be
// shown once and differing ones labelled by pathway: [{ value, names: [pathway names] }]
function groupPathwaysBy(entries, getValue) {
  const groups = [];
  entries.forEach(({ pathway, course }) => {
    const value = getValue(course);
    const group = groups.find((g) => g.value === value);
    if (group) group.names.push(pathway.name);
    else groups.push({ value, names: [pathway.name] });
  });
  return groups;
}

// "10–12" -> "Grades 10–12"; "9" -> "Grade 9"
function gradesLabel(grades) {
  const s = String(grades || "").trim();
  if (!s) return "";
  return /[–—,-]|\band\b/i.test(s) ? `Grades ${s}` : `Grade ${s}`;
}

// Turns a course title into a URL-safe anchor id, e.g. "AP Computer Science A" -> "ap-computer-science-a"
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
