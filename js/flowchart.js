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

let flowchartCount = 0;

// Renders one pathway and returns a function that redraws its connector lines
// (call it after un-hiding a chart that was rendered while hidden, e.g. a tab).
// opts.showName === false omits the pathway-name label (when tabs already show it).
// opts.anchorPrefix is the id prefix of the matching Course Details cards.
// A course may set choiceGroup (drawn with others of the same label as "choose
// one", joined by OR) and together (an AND joiner between it and the block above).
function renderFlowchart(container, pathway, accent, opts = {}) {
  const markerId = `flow-arrowhead-${flowchartCount++}`;
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

  const anchorPrefix = opts.anchorPrefix || "course-";

  const cardHtml = (c) => {
    const tagHtml = c.tag ? `<span class="flow-card-tag">${c.tag}</span>` : "";
    return `
      <a class="flow-card" data-title="${c.title.replace(/"/g, "&quot;")}"
         href="#${anchorPrefix}${slugify(c.title)}">
        ${tagHtml}
        <div class="flow-card-grades">${gradesLabel(c.grades)}</div>
        <div class="flow-card-title">${c.title}</div>
      </a>
    `;
  };

  // Within a column, courses sharing a choiceGroup label become one "choose one"
  // block (OR between them); any other course is a block on its own. A block
  // marked `together` gets an AND joiner between it and the block above it.
  const blocksOf = (col) => {
    const blocks = [];
    const groups = new Map();
    col.forEach((c) => {
      if (c.choiceGroup) {
        let block = groups.get(c.choiceGroup);
        if (!block) {
          block = { label: c.choiceGroup, courses: [], together: false };
          groups.set(c.choiceGroup, block);
          blocks.push(block);
        }
        block.courses.push(c);
        if (c.together) block.together = true;
      } else {
        blocks.push({ courses: [c], together: !!c.together });
      }
    });
    return blocks;
  };

  const cardsHtml = columns
    .map((col) => {
      const blocksHtml = blocksOf(col)
        .map((block, i) => {
          const joiner = i > 0 && block.together ? `<div class="flow-and">AND</div>` : "";
          const body = block.label
            ? `<div class="flow-choice">
                 <span class="flow-choice-label">${block.label}</span>
                 ${block.courses.map(cardHtml).join(`<div class="flow-or">OR</div>`)}
               </div>`
            : cardHtml(block.courses[0]);
          return joiner + body;
        })
        .join("");
      return `<div class="flow-column">${blocksHtml}</div>`;
    })
    .join("");

  container.innerHTML = `
    ${opts.showName === false ? "" : `<div class="pathway-name">${pathway.name}</div>`}
    <div class="flowchart-scroll">
      <div class="flowchart-grid">
        <svg class="flowchart-lines" aria-hidden="true"></svg>
        ${cardsHtml}
      </div>
    </div>
  `;

  const redraw = () => drawConnectors(container, courses, markerId);
  redraw();
  window.addEventListener("resize", debounce(redraw, 150));
  return redraw;
}

function drawConnectors(container, courses, markerId) {
  const grid = container.querySelector(".flowchart-grid");
  const svg = container.querySelector(".flowchart-lines");
  if (!grid || !svg) return;
  if (!grid.offsetWidth) return; // hidden (e.g. an inactive tab): nothing to measure yet

  const elByTitle = new Map();
  grid.querySelectorAll(".flow-card").forEach((el) => {
    elByTitle.set(el.dataset.title, el);
  });

  // Collapse the overlay before measuring so it can't inflate the layout it
  // is being sized from (an SVG defaults to 300x150 and would force a scrollbar).
  svg.setAttribute("width", 0);
  svg.setAttribute("height", 0);

  const gridRect = grid.getBoundingClientRect();
  let width = 0;
  let height = 0;
  elByTitle.forEach((el) => {
    const r = el.getBoundingClientRect();
    width = Math.max(width, r.right - gridRect.left);
    height = Math.max(height, r.bottom - gridRect.top);
  });
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  let paths = `
    <defs>
      <marker id="${markerId}" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
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
      const x1 = fromRect.right - gridRect.left;
      const y1 = fromRect.top - gridRect.top + fromRect.height / 2;
      const x2 = toRect.left - gridRect.left;
      const y2 = toRect.top - gridRect.top + toRect.height / 2;
      paths += `<path marker-end="url(#${markerId})" d="M ${x1} ${y1} L ${x2} ${y2}" />`;
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
