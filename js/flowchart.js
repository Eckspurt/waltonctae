/*
  Renders a course-progression flowchart from a pathway object
  (see js/data.js) into the given container element.

  pathway shape:
  {
    name: "Pathway name",
    courses: [
      {
        title, grades, desc,
        teachers: [{name, email, room}, ...],   // optional, course-specific
        prerequisites: ["Course Title", ...],    // titles of other courses in this list
        prereqLogic: "all" | "any",              // only matters when >1 prerequisite
        tag: "Elective" | "Capstone option" | ...  // optional small badge
        minColumn: 3                             // optional, 1-indexed override, no arrow implied
      },
      ...
    ]
  }

  Course levels (columns) are derived from the prerequisite graph rather
  than a fixed order, so branches (e.g. two courses that both unlock a
  later one) lay out correctly left-to-right. minColumn lets a course be
  pushed further right (e.g. a senior-only course with no true
  prerequisite) without drawing a prerequisite arrow.
*/

function renderFlowchart(container, pathway, accent) {
  container.style.setProperty("--accent", accent);

  const courses = pathway.courses || [];
  const byTitle = new Map(courses.map((c) => [c.title, c]));

  const levelCache = new Map();
  function levelOf(course, stack) {
    if (levelCache.has(course.title)) return levelCache.get(course.title);
    if (stack.has(course.title)) return 0; // guard against circular prerequisites
    stack.add(course.title);
    const prereqs = (course.prerequisites || [])
      .map((t) => byTitle.get(t))
      .filter(Boolean);
    const prereqLevel = prereqs.length
      ? 1 + Math.max(...prereqs.map((p) => levelOf(p, stack)))
      : 0;
    const minLevel = course.minColumn ? course.minColumn - 1 : 0;
    const level = Math.max(prereqLevel, minLevel);
    levelCache.set(course.title, level);
    return level;
  }
  courses.forEach((c) => levelOf(c, new Set()));

  const maxLevel = courses.length
    ? Math.max(...courses.map((c) => levelCache.get(c.title)))
    : 0;
  const columns = Array.from({ length: maxLevel + 1 }, () => []);
  courses.forEach((c) => columns[levelCache.get(c.title)].push(c));

  const cardsHtml = columns
    .map((col) => {
      const cardsInCol = col
        .map((c) => {
          const tagHtml = c.tag
            ? `<span class="flow-card-tag">${c.tag}</span>`
            : "";
          return `
            <a class="flow-card" data-title="${c.title.replace(/"/g, "&quot;")}"
               href="#course-${slugify(c.title)}">
              ${tagHtml}
              <div class="flow-card-grades">Grades ${c.grades}</div>
              <div class="flow-card-title">${c.title}</div>
            </a>
          `;
        })
        .join("");
      return `<div class="flow-column">${cardsInCol}</div>`;
    })
    .join("");

  container.innerHTML = `
    <div class="pathway-name">${pathway.name}</div>
    <div class="flowchart-scroll">
      <div class="flowchart-grid">
        <svg class="flowchart-lines" aria-hidden="true"></svg>
        ${cardsHtml}
      </div>
    </div>
  `;

  drawConnectors(container, courses);
  const redraw = () => drawConnectors(container, courses);
  window.addEventListener("resize", debounce(redraw, 150));
}

function drawConnectors(container, courses) {
  const grid = container.querySelector(".flowchart-grid");
  const svg = container.querySelector(".flowchart-lines");
  if (!grid || !svg) return;

  const elByTitle = new Map();
  grid.querySelectorAll(".flow-card").forEach((el) => {
    elByTitle.set(el.dataset.title, el);
  });

  const gridRect = grid.getBoundingClientRect();
  const width = grid.scrollWidth;
  const height = grid.scrollHeight;
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  let paths = `
    <defs>
      <marker id="flow-arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" />
      </marker>
    </defs>
  `;

  courses.forEach((c) => {
    const toEl = elByTitle.get(c.title);
    if (!toEl) return;
    (c.prerequisites || []).forEach((prereqTitle) => {
      const fromEl = elByTitle.get(prereqTitle);
      if (!fromEl) return;
      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();
      const x1 = fromRect.right - gridRect.left + grid.scrollLeft;
      const y1 = fromRect.top - gridRect.top + fromRect.height / 2 + grid.scrollTop;
      const x2 = toRect.left - gridRect.left + grid.scrollLeft;
      const y2 = toRect.top - gridRect.top + toRect.height / 2 + grid.scrollTop;
      paths += `<path marker-end="url(#flow-arrowhead)" d="M ${x1} ${y1} L ${x2} ${y2}" />`;
    });
  });

  svg.innerHTML = paths;
}

function youTubeIdFromUrl(url) {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/
  );
  return match ? match[1] : null;
}

function debounce(fn, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}
