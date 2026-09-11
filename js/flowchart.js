/*
  Renders a course-progression flowchart from a pathway object
  (see js/data.js) into the given container element.

  pathway shape:
  {
    name: "Pathway name",
    sequence: [ {id, title, grades, desc}, ... ],   // main left-to-right progression
    electives: [ {id, title, grades, note}, ... ]   // optional add-ons / capstones
  }
*/

function renderFlowchart(container, pathway, accent) {
  container.style.setProperty("--accent", accent);

  const sequenceHtml = pathway.sequence
    .map((course, i) => {
      const arrow =
        i < pathway.sequence.length - 1
          ? `<div class="flow-arrow" aria-hidden="true">
               <svg viewBox="0 0 24 24" width="28" height="28">
                 <path d="M4 12h14m0 0-5-5m5 5-5 5" fill="none" stroke="currentColor" stroke-width="2"
                       stroke-linecap="round" stroke-linejoin="round"/>
               </svg>
             </div>`
          : "";
      return `
        <div class="flow-step">
          <div class="flow-node">
            <div class="flow-node-badge">${i + 1}</div>
            <div class="flow-node-grades">Grades ${course.grades}</div>
            <div class="flow-node-title">${course.title}</div>
            <div class="flow-node-desc">${course.desc}</div>
          </div>
        </div>
        ${arrow}
      `;
    })
    .join("");

  const electivesHtml = (pathway.electives || [])
    .map(
      (item) => `
        <div class="elective-chip">
          <div class="elective-title">${item.title}</div>
          <div class="elective-meta">${item.note} · Grade ${item.grades}</div>
        </div>
      `
    )
    .join("");

  container.innerHTML = `
    <div class="pathway-name">${pathway.name}</div>
    <div class="flow-sequence">${sequenceHtml}</div>
    ${
      pathway.electives && pathway.electives.length
        ? `<div class="electives-section">
             <div class="electives-connector" aria-hidden="true"></div>
             <div class="electives-label">Electives &amp; Capstone Options</div>
             <div class="electives-row">${electivesHtml}</div>
           </div>`
        : ""
    }
  `;
}
