let state = null;
let activeThreadId = "";
let pendingApprovalDecision = "";
let pendingApprovalIds = [];
let transientStatus = "";
let sweepRequestedAt = 0;
// Selection is tracked here (not just in the DOM) so it survives the periodic
// re-render driven by the SSE /api/events stream and the 15s poll. Without this,
// a checkbox could be wiped by a refresh a couple seconds after being clicked.
const selectedApprovals = new Set();
let approvalsRenderSig = "";

const $ = (id) => document.getElementById(id);

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json();
  if (!response.ok || data.ok === false) throw new Error(data.error || response.statusText);
  return data;
}

function statusClass(status = "") {
  return `status ${(status || "queued").toLowerCase()}`;
}

function parseJson(value, fallback = "") {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

function looksLikeOutlookItemId(value = "") {
  const text = String(value).trim();
  return text.length >= 60 &&
    /^(AAMk|AMk|AQMk)/.test(text) &&
    !/\s/.test(text) &&
    /^[A-Za-z0-9+/=_-]+$/.test(text);
}

function outlookDraftHref(itemId = "") {
  return `https://outlook.office.com/mail/deeplink/compose/${encodeURIComponent(String(itemId).trim())}`;
}

function normalizeLink(value) {
  const link = typeof value === "string" ? parseJson(value, value) : value;
  if (!link) return null;
  if (typeof link === "string") {
    if (!link.trim()) return null;
    const href = link.trim();
    return looksLikeOutlookItemId(href)
      ? { label: "Open Outlook draft", href: outlookDraftHref(href), draftId: href }
      : { label: "Open result", href };
  }
  const href = link.href || link.url || link.path || "";
  if (looksLikeOutlookItemId(href)) {
    return { label: link.label || link.title || "Open Outlook draft", href: outlookDraftHref(href), draftId: href };
  }
  const label = link.label || link.title || (String(href).includes("outlook.office.com/mail") ? "Open Outlook draft" : "Open result");
  const oneDrivePath = link.oneDrivePath || "";
  return href ? { label, href, oneDrivePath, draftId: link.draftId || "" } : { label, href: "", oneDrivePath };
}

function linkHref(href = "") {
  if (!href) return "";
  if (href.startsWith("/")) return href;
  if (href.startsWith("http") || href.startsWith("file:")) return href;
  if (/^[A-Za-z]:\\/.test(href)) {
    return `file:///${encodeURI(href.replace(/\\/g, "/"))}`;
  }
  return "";
}

function renderLink(value) {
  const link = normalizeLink(value);
  if (!link) return "";
  const href = linkHref(link.href);
  return href
    ? `<div class="preview"><strong>Where it is:</strong> <a href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(link.label)}</a></div>`
    : `<div class="preview"><strong>Where it is:</strong> ${escapeHtml(link.href || link.label)}</div>`;
}

function formatTime(value) {
  return value ? new Date(value).toLocaleString() : "";
}

const PT_TZ = "America/Los_Angeles";

function friendlyPT(value) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString("en-US", {
    timeZone: PT_TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

// Replace raw ISO-8601 timestamps in display text with readable California time.
function humanizeTimes(text) {
  if (!text) return text;
  const iso = /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})\b/g;
  return text.replace(iso, (m) => friendlyPT(m));
}

function dateKey(value) {
  return value ? new Date(value).toLocaleDateString("en-CA") : "";
}

function currentDashboardDate() {
  return state?.serverTime ? dateKey(state.serverTime) : new Date().toLocaleDateString("en-CA");
}

function activeJobs() {
  return activeWorkJobs();
}

function completedJobs() {
  return state.jobs.filter((job) => ["completed", "done"].includes(job.status));
}

function linkedDocuments(date = currentDashboardDate()) {
  const seen = new Set();
  const docs = [];
  for (const job of completedJobs()) {
    if (date && dateKey(job.completed_at || job.updated_at || job.created_at) !== date) continue;
    const link = normalizeLink(job.result_link_json);
    if (!link?.href) continue;
    const key = link.href.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    docs.push({ job, link });
  }
  return docs;
}

function fileNameFromLink(link = {}) {
  const source = link.oneDrivePath || decodeURIComponent(String(link.href || "").split("?")[0]);
  const parts = String(source).replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || "";
}

function documentKind(fileName = "", label = "") {
  const text = `${fileName} ${label}`.toLowerCase();
  if (text.includes("outlook") || text.includes("email")) return "Email draft";
  if (text.endsWith(".pptx") || text.includes("powerpoint") || text.includes("deck")) return "PowerPoint deck";
  if (text.endsWith(".docx") || text.includes("word")) return "Word document";
  if (text.endsWith(".xlsx") || text.includes("spreadsheet") || text.includes("excel")) return "Spreadsheet";
  if (text.includes("teams")) return "Teams draft";
  return "Prepared item";
}

function humanizeFileName(fileName = "") {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");
  return withoutExtension
    .replace(/\b20\d{2}-\d{2}-\d{2}\b/g, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanResultSummary(summary = "") {
  return String(summary)
    .replace(/[A-Za-z]:\\[^\n\r]+/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s*(Published to Daily Flow Results:|The deck is published to Daily Flow Results:)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isOperationalResultSummary(summary = "") {
  const text = String(summary).toLowerCase();
  return [
    "verified real outlook draft",
    "exists in drafts",
    "placeholder id",
    "graph draft id",
    "inbox cleanup",
    "source email",
    "source message",
    "deleted the exact",
    "not sent",
    "report completed",
  ].some((marker) => text.includes(marker));
}

function contentRequestFromTitle(title = "") {
  let text = String(title)
    .replace(/^\[[^\]]+\]\s*/g, "")
    .replace(/^(re|fw|fwd):\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const afterColon = text.split(":").slice(1).join(":").trim();
  if (/\b(draft|write|create|prepare|explain|summarize|review|compare|build)\b/i.test(afterColon)) {
    text = afterColon;
  }
  text = text
    .replace(/^draft\s+/i, "")
    .replace(/^create\s+/i, "")
    .replace(/^write\s+/i, "")
    .replace(/^prepare\s+/i, "")
    .replace(/\.$/, "")
    .trim();
  return text || "a response for review";
}

function draftContentPreview(job, label = "") {
  const lowerLabel = String(label).toLowerCase();
  const kind = lowerLabel.includes("teams") ? "Teams message draft" : "Email draft";
  const request = contentRequestFromTitle(job.title);
  return `${kind} prepared for review: ${request}.`;
}

function resultPreview(job, link) {
  if (link.draftId) {
    return draftContentPreview(job, link.label);
  }
  const cleaned = cleanResultSummary(job.result_summary);
  if (cleaned && !isOperationalResultSummary(cleaned)) return cleaned;
  const fileName = fileNameFromLink(link);
  const topic = humanizeFileName(fileName) || job.title || link.label || "review";
  return `${documentKind(fileName, link.label)} prepared for review: ${topic}.`;
}

function renderMetrics() {
  $("approvalCount").textContent = kpiItems("approvals").length;
  $("urgentCount").textContent = kpiItems("urgent").length;
  $("taskCount").textContent = kpiItems("tasks").length;
  $("draftCount").textContent = kpiItems("results").length;
  $("inboxSignal").textContent = kpiItems("review").length;
  $("calendarSignal").textContent = kpiItems("calendar").length;
  $("teamsSignal").textContent = kpiItems("messages").length;
  $("ledgerUpdated").textContent = state.serverTime ? new Date(state.serverTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "—";
}

function jobsForEmployee(name) {
  return state.jobs.filter((job) => job.employee === name);
}

const TRUST_OPTIONS = [["draft", "Draft"], ["assist", "Assist"], ["autonomous", "Autonomous"]];
const TRUST_NAME = { draft: "Draft", assist: "Assist", autonomous: "Autonomous" };
// Which employee protocol panels are expanded — survives the ~15s SSE/poll re-render.
const expandedEmployees = new Set();

function protoList(items) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return "<li class='muted'>—</li>";
  return list.map((t) => `<li>${escapeHtml(t)}</li>`).join("");
}

function renderEmployees() {
  const active = (state.employees || []).filter((e) => (e.status || "active") === "active");
  $("employees").innerHTML = active.map((employee) => {
    const jobs = jobsForEmployee(employee.name);
    const active = jobs.find((job) => ["queued", "in_progress"].includes(job.status));
    const status = employee.workStatus || (active ? "working" : "ready");
    const initials = String(employee.name || "?").split(/\s+/).map((w) => w[0] || "").join("").slice(0, 2).toUpperCase();
    const trust = String(employee.trust_level || "draft").toLowerCase();
    const proto = employee.protocol || {};
    const enabled = employee.enabled !== false;
    const fixed = employee.mode === "fixed";
    const trustName = TRUST_NAME[trust] || "Draft";
    const open = expandedEmployees.has(employee.name) ? " open" : "";
    // Adjustable employees get a level dropdown; fixed ones (Major/Dash/Reese) get a locked badge + note.
    const levelControl = fixed
      ? `<div class="trust-fixed">Level <strong>${escapeHtml(trustName)}</strong> · fixed${employee.note ? `<span class="trust-note">${escapeHtml(employee.note)}</span>` : ""}</div>`
      : `<label class="trust-grad">Level
           <select data-emp-trust="${escapeHtml(employee.name)}">${TRUST_OPTIONS.map(([v, label]) => `<option value="${v}"${v === trust ? " selected" : ""}>${label}</option>`).join("")}</select>
         </label>`;
    const powerBtn = fixed
      ? ""
      : `<button type="button" class="emp-power ${enabled ? "on" : "off"}" data-emp-toggle="${escapeHtml(employee.name)}" data-enabled="${enabled}">${enabled ? "On" : "Paused"}</button>`;
    return `
      <article class="employee${enabled ? "" : " paused"}" data-trust="${trust}">
        <div class="employee-top">
          <div class="emp-id">
            <span class="avatar">${escapeHtml(initials)}</span>
            <h3>${escapeHtml(employee.name)}</h3>
          </div>
          <div class="emp-top-right">
            <span class="${statusClass(status)}">${escapeHtml(status)}</span>
            ${employee.removable ? `<button type="button" class="emp-remove" data-emp-remove="${escapeHtml(employee.name)}" title="Remove ${escapeHtml(employee.name)} from the team">✕</button>` : ""}
          </div>
        </div>
        <div class="role">${escapeHtml(employee.role)}</div>
        <div class="emp-trust-row">
          <span class="trust-badge trust-${trust}" title="${escapeHtml(employee.trustLabel || "")}">${escapeHtml(trustName)}</span>
          ${powerBtn}
        </div>
        <div class="skills">${escapeHtml(active?.title || employee.detail)}</div>
        <details class="emp-protocol" data-emp="${escapeHtml(employee.name)}"${open}>
          <summary>Trust &amp; protocol</summary>
          <div class="proto">
            <div class="trust-label-line">${escapeHtml(employee.trustLabel || "")}</div>
            <div class="proto-block always"><span class="proto-h">Always do</span><ul>${protoList(proto.alwaysDo)}</ul></div>
            <div class="proto-block ask"><span class="proto-h">Ask first</span><ul>${protoList(proto.askFirst)}</ul></div>
            <div class="proto-block never"><span class="proto-h">Never do</span><ul>${protoList(proto.neverDo)}</ul></div>
            ${levelControl}
          </div>
        </details>
      </article>
    `;
  }).join("");
}

function renderTaskSources() {
  const sources = Array.isArray(state.taskSources) ? state.taskSources : [];
  $("taskSources").innerHTML = sources.length ? sources.map((source) => `
    <a class="task-source" href="${escapeHtml(source.url)}" target="_blank" rel="noopener">
      <span class="task-source-name">${escapeHtml(source.name)}</span>
      <span class="task-source-type">${escapeHtml(source.type)}</span>
      <span class="task-source-owner">Tracked by ${escapeHtml(source.owner || "Reese")} ↗</span>
    </a>
  `).join("") : `<div class="empty">No task sources configured. Add taskSources to app/config.json.</div>`;
}
// Persist which protocol panels are open across re-renders.
document.addEventListener("toggle", (event) => {
  const d = event.target;
  if (!d.classList || !d.classList.contains("emp-protocol")) return;
  const name = d.getAttribute("data-emp");
  if (!name) return;
  if (d.open) expandedEmployees.add(name); else expandedEmployees.delete(name);
}, true);

// ---------- Composable team: onboarding cards, removed list, Add Employee dialog ----------
function renderOnboardingCards() {
  const host = $("onboardingCards");
  if (!host) return;
  const pending = (state.employees || []).filter((e) => e.status === "onboarding" || e.status === "review");
  if (!pending.length) { host.innerHTML = ""; return; }
  host.innerHTML = pending.map((e) => {
    const ready = e.status === "review";
    const msg = ready
      ? "Major proposed a profile — review and add to your team."
      : "Major is reading the material and will propose a profile…";
    return `
      <div class="onboard-card ${ready ? "ready" : ""}">
        <div class="onboard-main">
          <span class="onboard-spin">${ready ? "✓" : "⟳"}</span>
          <div>
            <div class="onboard-name">Onboarding ${escapeHtml(e.name)}</div>
            <div class="onboard-msg">${escapeHtml(msg)}</div>
          </div>
        </div>
        <div class="onboard-actions">
          ${ready ? `<button class="btn primary" data-onboard-review="${escapeHtml(e.name)}">Review proposal</button>` : ""}
          <button class="btn" data-onboard-cancel="${escapeHtml(e.name)}">Cancel</button>
        </div>
      </div>`;
  }).join("");
}

function renderRemovedEmployees() {
  const host = $("removedEmployees");
  if (!host) return;
  const removed = state.removedEmployees || [];
  if (!removed.length) { host.innerHTML = ""; return; }
  host.innerHTML = `
    <div class="removed-bar">
      <span class="removed-label">Removed (${removed.length}):</span>
      ${removed.map((e) => `<span class="removed-chip">${escapeHtml(e.name)} <button type="button" data-restore="${escapeHtml(e.name)}" title="Restore ${escapeHtml(e.name)}">restore</button></span>`).join("")}
    </div>`;
}

async function removeEmployee(name) {
  if (!confirm(`Remove ${name} from the active team?\n\nTheir past work stays in your ledger and any open jobs move to Major. You can restore them later.`)) return;
  try { await api(`/api/employees/${encodeURIComponent(name)}/remove`, { method: "POST", body: "{}" }); await loadState(); }
  catch (err) { transientStatus = `Could not remove ${name}: ${err.message}`; render(); }
}

async function restoreEmployee(name) {
  try { await api(`/api/employees/${encodeURIComponent(name)}/restore`, { method: "POST", body: "{}" }); await loadState(); }
  catch (err) { transientStatus = `Could not restore ${name}: ${err.message}`; render(); }
}

document.addEventListener("click", (event) => {
  const rm = event.target.closest("[data-emp-remove]");
  const restore = event.target.closest("[data-restore]");
  const review = event.target.closest("[data-onboard-review]");
  const cancel = event.target.closest("[data-onboard-cancel]");
  if (rm) { event.preventDefault(); removeEmployee(rm.getAttribute("data-emp-remove")); }
  else if (restore) { event.preventDefault(); restoreEmployee(restore.getAttribute("data-restore")); }
  else if (review) { event.preventDefault(); const e = (state.employees || []).find((x) => x.name === review.getAttribute("data-onboard-review")); if (e) openAddEmployeeReview(e); }
  else if (cancel) { event.preventDefault(); removeEmployee(cancel.getAttribute("data-onboard-cancel")); }
});

function openAddEmployee() {
  renderAddEmpForm();
  const dlg = $("addEmployeeDialog");
  if (dlg && !dlg.open) dlg.showModal();
}

function openAddEmployeeReview(emp) {
  renderAddEmpReview(emp);
  const dlg = $("addEmployeeDialog");
  if (dlg && !dlg.open) dlg.showModal();
}

async function extractFileToTextarea(file, textarea, statusEl) {
  if (!file || !textarea) return;
  if (statusEl) { statusEl.textContent = `Reading ${file.name}…`; statusEl.className = "career-status"; }
  try {
    const buf = await file.arrayBuffer();
    const res = await fetch("/api/career-profile/extract", {
      method: "POST",
      headers: { "X-Filename": encodeURIComponent(file.name), "Content-Type": "application/octet-stream" },
      body: buf
    });
    const data = await res.json();
    if (!res.ok || data.ok === false) throw new Error(data.error || res.statusText);
    const existing = textarea.value.trim();
    textarea.value = existing ? `${existing}\n\n${data.text}` : data.text;
    if (statusEl) { statusEl.textContent = `Loaded ${file.name}.`; statusEl.className = "career-status ok"; }
  } catch (err) {
    if (statusEl) { statusEl.textContent = `Could not read ${file.name}: ${err.message}`; statusEl.className = "career-status err"; }
  }
}

function renderAddEmpForm() {
  $("addEmpTitle").textContent = "Add an employee";
  $("addEmpSub").textContent = "Port one of your own Scout workflows in as a first-class team member.";
  $("addEmpBody").innerHTML = `
    <div class="add-emp-form">
      <label class="field-label">Name<input id="aeName" type="text" maxlength="40" placeholder="e.g. Nova" autocomplete="off"></label>
      <label class="field-label">What is this employee? <span class="muted">(optional, one line)</span><input id="aeHint" type="text" placeholder="e.g. Tracks contracts and renewals"></label>
      <label class="field-label">Their operating material <span class="muted">— paste their .md / workflow</span>
        <textarea id="aeSource" placeholder="Paste the markdown / instructions that define this employee…"></textarea>
      </label>
      <div class="upload-row"><input type="file" id="aeFile" accept=".txt,.md,.markdown,.docx"><span class="upload-hint">…or upload .txt, .md, or .docx</span></div>
      <label class="ae-check"><input type="checkbox" id="aeAnalyze" checked> Let Major read the material and propose the profile <span class="muted">(recommended)</span></label>
      <div class="career-actions">
        <button class="btn primary" id="aeStartBtn" type="button">Start onboarding</button>
        <span class="career-status" id="aeStatus"></span>
      </div>
    </div>`;
  const fileInput = $("aeFile");
  if (fileInput) fileInput.addEventListener("change", () => {
    const f = fileInput.files && fileInput.files[0];
    if (f) extractFileToTextarea(f, $("aeSource"), $("aeStatus"));
    fileInput.value = "";
  });
  $("aeStartBtn").addEventListener("click", startOnboarding);
}

async function startOnboarding() {
  const name = ($("aeName").value || "").trim();
  const status = $("aeStatus");
  if (!name) { status.textContent = "A name is required."; status.className = "career-status err"; return; }
  const analyze = $("aeAnalyze").checked;
  const body = { name, hint: ($("aeHint").value || "").trim(), sourceText: ($("aeSource").value || ""), analyze };
  status.textContent = analyze ? "Starting — Major will read the material…" : "Creating draft…";
  status.className = "career-status";
  try {
    const res = await api("/api/employees/add", { method: "POST", body: JSON.stringify(body) });
    await loadState();
    if (res.analyzing) {
      renderAddEmpAnalyzing(name);
    } else {
      const emp = (state.employees || []).find((e) => e.name === name);
      if (emp) renderAddEmpReview(emp); else closeAddEmployee();
    }
  } catch (err) {
    status.textContent = `Could not start: ${err.message}`;
    status.className = "career-status err";
  }
}

function renderAddEmpAnalyzing(name) {
  $("addEmpTitle").textContent = `Onboarding ${name}`;
  $("addEmpSub").textContent = "Major is getting to know your new employee.";
  $("addEmpBody").innerHTML = `
    <div class="ae-analyzing">
      <div class="ae-spin-big">⟳</div>
      <p>Major is reading <strong>${escapeHtml(name)}</strong>'s material and will propose a role, triggers, skills, and trust level.</p>
      <p class="muted">This takes a moment. You can close this — a card on the cockpit will say when the proposal is ready to review, and you'll get a Teams ping.</p>
      <div class="career-actions"><button class="btn" id="aeCloseAnalyzeBtn" type="button">Close — I'll review later</button></div>
    </div>`;
  $("aeCloseAnalyzeBtn").addEventListener("click", closeAddEmployee);
}

function renderAddEmpReview(emp) {
  $("addEmpTitle").textContent = `Review ${emp.name}`;
  $("addEmpSub").textContent = "Edit anything, then add them to your team. Their level starts at Draft — you can change it anytime.";
  const always = (emp.always || []).join("\n");
  const skills = (emp.skills || []).join(", ");
  const lvl = (emp.trust_level || "draft");
  $("addEmpBody").innerHTML = `
    <div class="add-emp-form" data-emp="${escapeHtml(emp.name)}">
      <label class="field-label">Role<input id="aeRole" type="text" maxlength="60" value="${escapeHtml(emp.role || "")}"></label>
      <label class="field-label">Summary<input id="aeSummary" type="text" value="${escapeHtml(emp.detail || "")}"></label>
      <div class="ae-two">
        <label class="field-label">Does on its own <span class="muted">(internal)</span><input id="aeInternal" type="text" placeholder="e.g. organize and tag contract files" value="${escapeHtml(emp.internal || "")}"></label>
        <label class="field-label">Outward action<input id="aeOutward" type="text" placeholder="e.g. send contract status emails" value="${escapeHtml(emp.outward || "")}"></label>
      </div>
      <label class="field-label">Always do <span class="muted">(one per line)</span><textarea id="aeAlways" rows="3" placeholder="Track contract renewal dates&#10;Flag expiring MSAs">${escapeHtml(always)}</textarea></label>
      <label class="field-label">Engage when <span class="muted">— tells Major when to use them</span><textarea id="aeTriggers" rows="2" placeholder="when an email or Teams message mentions a contract, renewal, SOW, or MSA">${escapeHtml(emp.triggers || "")}</textarea></label>
      <label class="field-label">Skills <span class="muted">(comma-separated Scout skill ids)</span><input id="aeSkills" type="text" placeholder="docx, researcher-agent" value="${escapeHtml(skills)}"></label>
      <label class="field-label">Starting trust level
        <select id="aeLevel">
          <option value="draft"${lvl === "draft" ? " selected" : ""}>Draft — prepares, you send</option>
          <option value="assist"${lvl === "assist" ? " selected" : ""}>Assist — you approve, it sends</option>
          <option value="autonomous"${lvl === "autonomous" ? " selected" : ""}>Autonomous — it sends</option>
        </select>
      </label>
      <div id="aeSkillCheck" class="ae-skillcheck"></div>
      <div class="career-actions">
        <button class="btn primary" id="aeConfirmBtn" type="button">Add ${escapeHtml(emp.name)} to the team</button>
        <button class="btn" id="aeCancelReviewBtn" type="button">Cancel onboarding</button>
        <span class="career-status" id="aeStatus"></span>
      </div>
    </div>`;
  $("aeConfirmBtn").addEventListener("click", () => confirmEmployee(emp.name));
  $("aeCancelReviewBtn").addEventListener("click", () => { removeEmployee(emp.name); closeAddEmployee(); });
  $("aeSkills").addEventListener("change", () => checkSkills());
  checkSkills();
}

function reviewSkillList() {
  return ($("aeSkills").value || "").split(",").map((s) => s.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "")).filter(Boolean);
}

async function checkSkills() {
  const host = $("aeSkillCheck");
  if (!host) return;
  const skills = reviewSkillList();
  if (!skills.length) { host.innerHTML = ""; return; }
  try {
    const res = await api("/api/skills/check", { method: "POST", body: JSON.stringify({ skills }) });
    host.innerHTML = `<div class="ae-skill-h">Skills check</div>` + (res.results || []).map((r) =>
      `<div class="ae-skill-row ${r.installed ? "ok" : "missing"}">
        <span>${r.installed ? "✓" : "⚠"} ${escapeHtml(r.name)}</span>
        <span class="ae-skill-state">${r.installed ? "installed" : `<button class="btn tiny" data-install-skill="${escapeHtml(r.name)}">Install</button>`}</span>
      </div>`).join("");
    host.querySelectorAll("[data-install-skill]").forEach((btn) => btn.addEventListener("click", () => installSkill(btn.getAttribute("data-install-skill"))));
  } catch (err) { host.innerHTML = `<div class="career-status err">Skill check failed: ${escapeHtml(err.message)}</div>`; }
}

async function installSkill(name) {
  const host = $("aeSkillCheck");
  try {
    const res = await api("/api/skills/install", { method: "POST", body: JSON.stringify({ name }) });
    if (!res.installed) {
      const text = prompt(`Couldn't find "${name}" locally. Paste its SKILL.md contents to install it (or Cancel):`);
      if (text && text.trim()) {
        const res2 = await api("/api/skills/install", { method: "POST", body: JSON.stringify({ name, text }) });
        if (res2.installed) transientStatus = `Installed ${name}. Restart Scout to activate it.`;
      }
    } else {
      transientStatus = `Installed ${name}. Restart Scout to activate it.`;
    }
  } catch (err) { transientStatus = `Install failed: ${err.message}`; }
  checkSkills();
}

async function confirmEmployee(name) {
  const status = $("aeStatus");
  const body = {
    role: $("aeRole").value, summary: $("aeSummary").value,
    internal: $("aeInternal").value, outward: $("aeOutward").value,
    always: ($("aeAlways").value || "").split("\n").map((s) => s.trim()).filter(Boolean),
    triggers: $("aeTriggers").value, skills: reviewSkillList(), level: $("aeLevel").value
  };
  status.textContent = "Adding…"; status.className = "career-status";
  try {
    await api(`/api/employees/${encodeURIComponent(name)}/confirm`, { method: "POST", body: JSON.stringify(body) });
    await loadState();
    closeAddEmployee();
  } catch (err) { status.textContent = `Could not add: ${err.message}`; status.className = "career-status err"; }
}

function closeAddEmployee() {
  const dlg = $("addEmployeeDialog");
  if (dlg && dlg.open) dlg.close();
}

const ACTION_LABELS = { approved: "Approve", rejected: "Reject", deferred: "Defer" };
const ALL_ACTIONS = ["approved", "rejected", "deferred"];

const APPROVAL_GROUPS = [
  { key: "calendar", icon: "📅", label: "Calendar invites", types: ["calendar"], actions: ALL_ACTIONS,
    legend: "Approve = RSVP Accept · Reject = RSVP Decline · Defer = remove the invite, decide later",
    capabilities: "Approve sends a real RSVP (Accept/Decline) on the original invite. Defer just clears the card without responding. Proposing a new time isn't available from here." },
  { key: "email", icon: "✉️", label: "Emails", types: ["email"], actions: ALL_ACTIONS,
    legend: "Approve = Major carries out your instruction on this email for real (reply, send, forward) and files the source — drafts only if you ask · Reject = delete the email · Defer = dismiss (email kept)",
    capabilities: "CAN: actually send your reply/forward from Outlook and file the source email. Say \"draft it\" in your note to get a reviewable draft instead of sending. CAN'T: send to brand-new recipients you didn't name, or send if it can't resolve the recipient (it'll report blocked)." },
  { key: "teams", icon: "💬", label: "Teams", types: ["teams"], actions: ["approved", "rejected"],
    legend: "Approve = Major carries out your instruction on the original chat for real (reply, 👍 react, forward, send) — drafts only if you ask · Reject = dismiss",
    capabilities: "CAN: post your reply for real in the original 1:1/chat; say \"draft it\" to get a draft instead. CAN'T: add a native emoji reaction (the tap-the-message kind) — that tool isn't available, so a \"👍 react\" request is sent as a short \"👍\" reply in the chat." },
  { key: "task-tracking", icon: "📋", label: "Tracked tasks & decisions", types: ["task-tracking"], actions: ALL_ACTIONS,
    legend: "Approve = Reese follows up privately · Reject = dismiss · Defer = snooze",
    capabilities: "Reese tracks configured Planner, Loop, Microsoft To Do, and Azure DevOps sources. Approving asks Reese to investigate or prepare the next step; source-system changes require an explicit instruction." },
  { key: "suggestions", icon: "🧠", label: "Suggestions",
    types: ["meeting-prep", "commitment", "blocked-work", "outbound-draft", "research", "impact-highlight", "stale-thread"],
    actions: ALL_ACTIONS,
    legend: "Approve = do the work (outbound items are carried out per your instruction) · Reject = skip · Defer = snooze",
    capabilities: "Approve = the team does the work and prepares the result; anything outbound is carried out per your instruction. These are internal prep, research, and draft items — nothing is sent unless you say so." },
];

function approvalEffect(actionType, decision) {
  const effects = {
    calendar: { approved: "RSVP Accept", rejected: "RSVP Decline", deferred: "Remove the invite from your Inbox (no RSVP)" },
    email: { approved: "Do what you instructed on this email for real (send/reply/forward), then file the source — drafts only if you ask", rejected: "Delete the email from your Inbox", deferred: "Dismiss this card (email left untouched)" },
    teams: { approved: "Do what you instructed on the original chat for real (reply, 👍 react, forward) — drafts only if you ask", rejected: "Dismiss this card", deferred: "Dismiss this card" },
  };
  const advisory = { approved: "Do the work (outbound items are carried out per your instruction)", rejected: "Skip it", deferred: "Snooze it" };
  return (effects[actionType] || advisory)[decision] || decision;
}

function approvalGroupItems(groupKey) {
  const group = APPROVAL_GROUPS.find((g) => g.key === groupKey);
  if (!group || !state || !state.approvals) return [];
  return state.approvals.filter((approval) => group.types.includes(approval.action_type));
}

function syncSelectAllStates() {
  APPROVAL_GROUPS.forEach((group) => {
    const selectAll = document.querySelector(`[data-group-selectall="${group.key}"]`);
    if (!selectAll) return;
    const items = approvalGroupItems(group.key);
    const selectedCount = items.filter((a) => selectedApprovals.has(a.id)).length;
    selectAll.checked = items.length > 0 && selectedCount === items.length;
    selectAll.indeterminate = selectedCount > 0 && selectedCount < items.length;
  });
}

function renderApprovals() {
  const container = $("approvals");
  if (!state.approvals.length) {
    container.innerHTML = `<div class="empty">No pending approvals.</div>`;
    approvalsRenderSig = "";
    selectedApprovals.clear();
    return;
  }
  // Forget selections for cards that are no longer pending (acted on or retired).
  const liveIds = new Set(state.approvals.map((a) => a.id));
  for (const id of [...selectedApprovals]) if (!liveIds.has(id)) selectedApprovals.delete(id);

  // Only rebuild the DOM when the set of cards actually changes. A 2s SSE refresh that
  // does not change the cards must NOT wipe an in-progress selection, so on a no-op
  // refresh we just re-apply the tracked selection to the existing checkboxes.
  const sig = state.approvals.map((a) => `${a.id}:${a.status}`).join("|");
  if (sig === approvalsRenderSig && container.querySelector("[data-approval-check]")) {
    container.querySelectorAll("[data-approval-check]").forEach((cb) => {
      cb.checked = selectedApprovals.has(cb.dataset.approvalCheck);
    });
    syncSelectAllStates();
    return;
  }
  approvalsRenderSig = sig;

  container.innerHTML = APPROVAL_GROUPS.map((group) => {
    const items = state.approvals.filter((approval) => group.types.includes(approval.action_type));
    if (!items.length) return "";
    const cards = items.map((approval) => `
      <article class="approval">
        <input type="checkbox" data-approval-check="${escapeHtml(approval.id)}" data-group="${group.key}"${selectedApprovals.has(approval.id) ? " checked" : ""} aria-label="Select ${escapeHtml(approval.title)}">
        <div>
          <h3>${escapeHtml(approval.title)}</h3>
          <div class="approval-meta">
            <span>${escapeHtml(approval.employee)}</span>
            <span class="risk ${escapeHtml(approval.risk)}">${escapeHtml(approval.risk)}</span>
            <span>${escapeHtml(approval.action_type)}</span>
            ${approval.sourceUrl ? `<a class="approval-source" href="${escapeHtml(approval.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(approval.sourceLabel || "Open source")} ↗</a>` : ""}
          </div>
          <div class="preview">${humanizeTimes(escapeHtml(approval.preview))}</div>
        </div>
      </article>`).join("");
    return `
      <section class="approval-group" data-group-section="${group.key}">
        <div class="approval-group-head">
          <h3 class="approval-group-title">${group.icon} ${escapeHtml(group.label)} <span class="approval-group-count">(${items.length})</span>${group.capabilities ? gInfo(group.capabilities) : ""}</h3>
          <label class="approval-selectall"><input type="checkbox" data-group-selectall="${group.key}"> Select all</label>
        </div>
        <div class="approval-group-bar">
          <div class="toolbar approval-group-actions" style="justify-content:flex-start;">
            ${(group.actions || ALL_ACTIONS).map((action, i) => `<button class="btn ${i === 0 ? "primary" : ""}" data-group-action="${action}" data-group-key="${group.key}">${ACTION_LABELS[action]}</button>`).join("")}
          </div>
          <p class="approval-legend">${escapeHtml(group.legend)}</p>
        </div>
        <div class="approval-group-list">${cards}</div>
      </section>`;
  }).join("");
  syncSelectAllStates();
}

function sendControl(job) {
  const s = job.send_state || "";
  if (s === "open_to_send") {
    return `<div class="send-row"><span class="send-tag manual">Ready — open it above and send it yourself</span></div>`;
  }
  if (s === "ready") {
    return `<div class="send-row"><button type="button" class="btn primary send-btn" data-send-draft="${escapeHtml(job.id)}">Send</button><span class="send-hint">${escapeHtml(job.employee)} will deliver it on your click</span></div>`;
  }
  if (s === "held_classified") {
    return `<div class="send-row held"><button type="button" class="btn send-btn" data-send-draft="${escapeHtml(job.id)}">Review &amp; Send</button><span class="send-hint">🔒 Confidential — held for your OK even at Autonomous</span></div>`;
  }
  if (s === "sent") {
    return `<div class="send-row"><span class="send-tag sent">Sent ✓</span></div>`;
  }
  return "";
}

function renderDrafts() {
  const docs = linkedDocuments();
  $("drafts").innerHTML = docs.length ? docs.map(({ job, link }) => {
    const href = linkHref(link.href);
    const previewText = resultPreview(job, link);
    const linkContent = href
      ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(link.label)}</a>`
      : escapeHtml(link.href);
    return `
    <article class="item">
      <div class="item-top">
        <h3>${linkContent}</h3>
        <span class="${statusClass(job.status)}">${escapeHtml(job.status)}</span>
      </div>
      <div class="small-meta">
        <span>Created by ${escapeHtml(job.employee)}</span>
        <span>${formatTime(job.completed_at || job.updated_at)}</span>
      </div>
      <div class="preview">${escapeHtml(previewText)}</div>
      ${sendControl(job)}
    </article>
  `}).join("") : `<div class="empty">No created documents with links yet for today. Use Previous to browse earlier days.</div>`;
}

async function sendPreparedDraft(jobId) {
  try {
    await api(`/api/drafts/${encodeURIComponent(jobId)}/send`, { method: "POST", body: "{}" });
    await loadState();
  } catch (err) {
    transientStatus = `Could not send: ${err.message}`;
    render();
  }
}
document.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-send-draft]");
  if (btn) sendPreparedDraft(btn.getAttribute("data-send-draft"));
});

function messagesForActiveView() {
  return state.messages.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function minutesSince(value) {
  if (!value) return "";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  return minutes <= 0 ? "just now" : `${minutes} min ago`;
}

function activeWorkJobs() {
  return state.jobs.filter((job) =>
    ["queued", "in_progress", "blocked"].includes(job.status)
    && ["calendar-rsvp", "employee-work", "manual-signal-sweep", "email-action", "teams-action", "workflow-action"].includes(job.type)
  );
}

// Internal orchestration jobs that should never surface as user-facing work
// (the broad sweep is plumbing for Major, not an actionable task for the user).
const INTERNAL_JOB_TYPES = ["manual-signal-sweep"];

function userWorkJobs() {
  return activeWorkJobs().filter((job) => !INTERNAL_JOB_TYPES.includes(job.type));
}

function kpiItems(metric) {
  const work = userWorkJobs();
  return {
    approvals: state.approvals,
    urgent: [
      ...state.approvals.filter((approval) => ["high", "medium"].includes(approval.risk)),
      ...work.filter((job) => ["urgent", "high"].includes(job.priority)),
    ],
    tasks: work,
    results: linkedDocuments(),
    review: state.approvals.filter((approval) => ["email", "teams"].includes(approval.action_type)),
    calendar: state.approvals.filter((approval) => approval.action_type === "calendar"),
    messages: messagesForActiveView(),
  }[metric] || [];
}

function renderWorkStatus(job, activeCount, message = "") {
  const lastUpdate = minutesSince(job.updated_at || job.created_at);
  const pulse = job.status === "blocked" ? "Waiting on blocker" : "Next Major status pulse within 3 min";
  const width = job.status === "queued" ? 24 : job.status === "in_progress" ? 62 : job.status === "blocked" ? 100 : 80;
  $("chatStatus").className = `attention-banner active work-status ${job.status}`;
  $("chatStatus").innerHTML = `
    <div class="work-status-top">
      <strong>${escapeHtml(message || job.title)}</strong>
      <span>${escapeHtml(job.status)}</span>
    </div>
    <div class="work-status-meta">
      <span>Owner: ${escapeHtml(job.employee || "Major")}</span>
      <span>Active work: ${activeCount}</span>
      <span>Last update: ${escapeHtml(lastUpdate || "not yet")}</span>
      <span>ETA: ${escapeHtml(pulse)}</span>
    </div>
    <div class="work-progress" aria-hidden="true"><span style="width:${width}%"></span></div>
  `;
}

function latestSweep() {
  return state.jobs
    .filter((job) => job.type === "manual-signal-sweep")
    .sort((a, b) =>
      new Date(b.completed_at || b.updated_at || b.created_at) -
      new Date(a.completed_at || a.updated_at || a.created_at))[0];
}

function renderSweepSummary(sweep) {
  const cleaned = cleanResultSummary(sweep.result_summary) || "Broad sweep complete.";
  const when = sweep.completed_at || sweep.updated_at;
  $("chatStatus").className = "attention-banner active done";
  $("chatStatus").innerHTML = `
    <div class="work-status-top">
      <strong>Last Attention Major sweep — ${escapeHtml(cleaned)}</strong>
      <span>done</span>
    </div>
    <div class="work-status-meta">
      <span>Owner: Major</span>
      <span>Swept: ${escapeHtml(formatTime(when))}</span>
      <span>${escapeHtml(minutesSince(when) || "just now")}</span>
    </div>
  `;
}

function renderChatStatus() {
  const activeJobs = activeWorkJobs();
  const active = activeJobs[0];
  const sweep = latestSweep();
  const sweepDone = sweep && ["completed", "done"].includes(sweep.status);

  // A sweep that finished after the user's last request supersedes the transient "queued" banner.
  if (sweepRequestedAt && sweepDone) {
    const doneAt = new Date(sweep.completed_at || sweep.updated_at).getTime();
    if (doneAt >= sweepRequestedAt - 1000) {
      transientStatus = "";
      sweepRequestedAt = 0;
    }
  }

  if (transientStatus) {
    renderWorkStatus({ title: transientStatus, status: "queued", employee: "Major", updated_at: new Date().toISOString() }, 1, transientStatus);
    return;
  }
  if (!active) {
    // No active work: confirm the most recent sweep instead of going blank, so each press shows what Major found.
    const recent = sweepDone && (Date.now() - new Date(sweep.completed_at || sweep.updated_at).getTime()) < 45 * 60000;
    if (recent) {
      renderSweepSummary(sweep);
      return;
    }
    $("chatStatus").className = "attention-banner";
    $("chatStatus").textContent = "";
    return;
  }
  $("chatStatus").className = `attention-banner active ${active.status === "completed" ? "done" : active.status}`;
  if (active.type === "calendar-rsvp") {
    renderWorkStatus(active, activeJobs.length, active.status === "in_progress"
      ? `Mina is executing the RSVP: ${active.title}. This will update when completed or blocked.`
      : active.status === "blocked"
        ? `Mina is blocked on the RSVP: ${active.title}. Check the activity log for details.`
        : `RSVP queued: ${active.title}. The approval was removed from the inbox and the worker will report completion here.`);
    return;
  }
  if (active.type === "manual-signal-sweep") {
    renderWorkStatus(active, activeJobs.length, active.status === "in_progress"
      ? "Major is running a broad sweep now across app state, Outlook email, Inbox invites, calendar, Teams, Planner, Loop, To Do, ADO, WorkIQ/research context, drafts/results, blockers, and impact highlights."
      : active.status === "blocked"
        ? "Major's broad sweep is blocked. Check the activity log for details."
        : "Broad Attention Major sweep queued. This view updates live as Major checks app state, Outlook, calendar, Teams, Planner, Loop, To Do, ADO, WorkIQ/research context, drafts/results, blockers, and impact highlights.");
    return;
  }
  renderWorkStatus(active, activeJobs.length, active.status === "in_progress"
    ? `Major is working on: ${active.title}. Major will report who did the work, completion or blocker, and where the result is.`
    : active.status === "blocked"
      ? `Major is blocked on: ${active.title}. Check the thread for the blocker.`
      : `${active.title} is queued for Major. This view updates live when Major reports real progress or completion.`);
}

function renderMessages() {
  const messages = messagesForActiveView();
  $("messages").innerHTML = messages.length ? messages.map((message) => `
    <article class="chat-message ${message.sender === "user" ? "user" : "major"}">
      <div class="item-top">
        <h3>${escapeHtml(message.sender === "user" ? "You" : "Major")}</h3>
        <span class="${statusClass(message.status)}">${escapeHtml(message.status)}</span>
      </div>
      <div class="small-meta">
        <span>${escapeHtml(message.sender === "user" ? "To Major" : "From Major")}</span>
        <span>${formatTime(message.created_at)}</span>
      </div>
      <div class="message-body">${escapeHtml(message.message)}</div>
      ${renderLink(message.link_json)}
      <div class="toolbar" style="margin-top:10px; justify-content:flex-start;">
        <button data-thread="${escapeHtml(message.thread_id)}">Reply in thread</button>
      </div>
    </article>
  `).join("") : `<div class="empty">No Major chat messages yet.</div>`;
  renderChatStatus();
}

function renderThreadContext() {
  if (!activeThreadId) {
    $("threadContext").className = "chat-context";
    $("threadContext").textContent = "";
    $("sendBtn").textContent = "Send to Major";
    return;
  }
  $("threadContext").className = "chat-context active";
  $("threadContext").textContent = "Replying in an existing Major thread. Your next message will stay attached to this conversation.";
  $("sendBtn").textContent = "Reply in thread";
}

function renderFirstRunBanner() {
  const el = $("firstRunBanner");
  if (!el) return;
  const boardEmpty =
    state.approvals.length === 0 &&
    (((state.workLedgerToday && state.workLedgerToday.todayCount) || 0) === 0) &&
    kpiItems("results").length === 0 &&
    kpiItems("review").length === 0 &&
    kpiItems("calendar").length === 0 &&
    kpiItems("messages").length === 0 &&
    kpiItems("tasks").length === 0;
  if (!boardEmpty) {
    el.hidden = true;
    el.className = "first-run-banner";
    return;
  }
  const sweeps = state.jobs.filter((job) => job.type === "manual-signal-sweep");
  const sweepActive = sweeps.some((job) => ["queued", "in_progress"].includes(job.status));
  const everCompleted = sweeps.some((job) => ["completed", "done"].includes(job.status));
  let title;
  let body;
  let variant;
  if (sweepActive) {
    variant = "working";
    title = "Your team is doing its first sweep";
    body = "This usually takes 5 to 10 minutes, and the board fills in as it goes. You can leave this page open — it refreshes on its own.";
  } else if (everCompleted) {
    variant = "clear";
    title = "You're all caught up";
    body = "Your team checked your email, Teams, calendar, and meetings and found nothing that needs you right now. New items show up here automatically, or press Attention Major at the top to sweep again.";
  } else {
    variant = "";
    title = "Your board is ready to fill";
    body = "Press Attention Major at the top to run the first sweep across your email, Teams, calendar, and meetings. It takes about 5 to 10 minutes and fills the board as it goes.";
  }
  el.hidden = false;
  el.className = `first-run-banner${variant ? " " + variant : ""}`;
  el.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(body)}</span>`;
}

function render() {
  renderFirstRunBanner();
  renderMetrics();
  renderEmployees();
  renderTaskSources();
  renderOnboardingCards();
  renderRemovedEmployees();
  renderGuardrails();
  renderCivilianBadge();
  renderApprovals();
  renderDecisionMemory();
  renderDrafts();
  renderMessages();
  renderThreadContext();
}

async function loadState() {
  state = await api("/api/state");
  render();
}

async function sendChat(event) {
  event.preventDefault();
  const message = $("chatMessage").value.trim();
  if (!message) return;
  const result = await api("/api/chat", {
    method: "POST",
    body: JSON.stringify({ message, threadId: activeThreadId || undefined })
  });
  activeThreadId = result.threadId;
  $("chatMessage").value = "";
  await loadState();
}

async function attentionMajor() {
  $("attentionBtn").disabled = true;
  sweepRequestedAt = Date.now();
  transientStatus = "Attention Major requested. Queuing a broad sweep across app state, Outlook email, calendar, Inbox invites, Teams, WorkIQ/research context, drafts/results, blockers, and impact highlights...";
  renderChatStatus();
  try {
    const result = await api("/api/attention-major", {
      method: "POST",
      body: JSON.stringify({ source: "dashboard", force: true })
    });
    transientStatus = result.queued
      ? "Broad Attention Major sweep queued. Major will refresh signals and post live progress/results here as soon as the worker picks it up."
      : `Broad Attention Major sweep is already ${result.status}. Refreshing the cockpit now.`;
    await loadState();
    setTimeout(loadState, 1000);
    setTimeout(loadState, 3000);
    setTimeout(loadState, 7000);
    setTimeout(loadState, 20000);
    setTimeout(loadState, 40000);
    setTimeout(loadState, 65000);
  } finally {
    $("attentionBtn").disabled = false;
  }
}

function selectedApprovalIds(groupKey) {
  if (!groupKey) return [...selectedApprovals];
  const groupIds = new Set(approvalGroupItems(groupKey).map((a) => a.id));
  return [...selectedApprovals].filter((id) => groupIds.has(id));
}

function openApprovalFeedback(status, ids) {
  const selected = (ids && ids.length) ? ids : selectedApprovalIds();
  if (!selected.length) {
    alert("Select at least one item in this group first.");
    return;
  }
  pendingApprovalDecision = status;
  pendingApprovalIds = selected;
  const label = { approved: "Approve", rejected: "Reject", deferred: "Defer" }[status] || "Send";
  $("approvalFeedbackTitle").textContent = `${label} ${selected.length} item${selected.length === 1 ? "" : "s"}`;
  const effects = selected.map((id) => {
    const approval = state.approvals.find((item) => item.id === id);
    if (!approval) return "";
    return `<li><strong>${escapeHtml(approvalEffect(approval.action_type, status))}</strong> — ${escapeHtml(approval.title)}</li>`;
  }).join("");
  $("approvalFeedbackEffects").innerHTML = `<p class="effects-label">This will:</p><ul class="effects-list">${effects}</ul>`;
  $("approvalFeedbackText").value = "";
  $("submitApprovalFeedbackBtn").textContent = `${label} and notify Major`;
  $("approvalFeedbackDialog").showModal();
  $("approvalFeedbackText").focus();
}

function setDecisionButtonsDisabled(disabled) {
  document.querySelectorAll("[data-group-action]").forEach((button) => {
    button.disabled = disabled;
  });
}

async function decideSelectedApprovals(status, userGuidance = "") {
  const selected = pendingApprovalIds.slice();
  if (!selected.length) throw new Error("No approvals are selected.");
  transientStatus = `Sending ${selected.length} approval decision${selected.length === 1 ? "" : "s"} to Major...`;
  renderChatStatus();
  setDecisionButtonsDisabled(true);
  for (const approvalId of selected) {
    await api(`/api/approvals/${approvalId}`, {
      method: "POST",
      body: JSON.stringify({ status, userGuidance })
    });
  }
  state.approvals = state.approvals.filter((approval) => !selected.includes(approval.id));
  state.metrics.pendingApprovals = state.approvals.length;
  transientStatus = status === "deferred"
    ? `${selected.length} item${selected.length === 1 ? "" : "s"} deferred and removed from the Approval inbox. Meeting defers queue exact Inbox invite cleanup; email and Teams defers are dismiss-only.`
    : `${selected.length} approval decision${selected.length === 1 ? "" : "s"} sent. The item was removed from the inbox; RSVP/follow-up work is queued and will update live here.`;
  render();
  await loadState();
  setTimeout(() => {
    transientStatus = "";
    renderChatStatus();
  }, 8000);
  setDecisionButtonsDisabled(false);
}

async function submitApprovalFeedback(event) {
  event.preventDefault();
  if (!pendingApprovalDecision) return;
  $("submitApprovalFeedbackBtn").disabled = true;
  try {
    await decideSelectedApprovals(pendingApprovalDecision, $("approvalFeedbackText").value.trim());
    $("approvalFeedbackDialog").close();
    pendingApprovalDecision = "";
    pendingApprovalIds = [];
  } catch (error) {
    transientStatus = `Approval decision failed: ${error.message}. Nothing was changed; try again or ask Major to inspect the blocker.`;
    renderChatStatus();
    console.error(error);
  } finally {
    $("submitApprovalFeedbackBtn").disabled = false;
    setDecisionButtonsDisabled(false);
  }
}

document.addEventListener("click", async (event) => {
  const groupActionBtn = event.target.closest("[data-group-action]");
  if (groupActionBtn) {
    const groupKey = groupActionBtn.dataset.groupKey;
    const ids = selectedApprovalIds(groupKey);
    if (!ids.length) {
      alert("Select at least one item in this group first.");
      return;
    }
    openApprovalFeedback(groupActionBtn.dataset.groupAction, ids);
    return;
  }
  const approvalButton = event.target.closest("[data-approval]");
  if (approvalButton) {
    await api(`/api/approvals/${approvalButton.dataset.approval}`, {
      method: "POST",
      body: JSON.stringify({ status: approvalButton.dataset.decision })
    });
    await loadState();
    return;
  }
  const threadButton = event.target.closest("[data-thread]");
  if (threadButton) {
    activeThreadId = threadButton.dataset.thread;
    renderThreadContext();
    $("chatMessage").focus();
  }
});

document.addEventListener("change", (event) => {
  const selectAll = event.target.closest("[data-group-selectall]");
  if (selectAll) {
    const groupKey = selectAll.dataset.groupSelectall;
    approvalGroupItems(groupKey).forEach((a) => {
      if (selectAll.checked) selectedApprovals.add(a.id);
      else selectedApprovals.delete(a.id);
    });
    document.querySelectorAll(`[data-approval-check][data-group="${groupKey}"]`).forEach((checkbox) => {
      checkbox.checked = selectAll.checked;
    });
    selectAll.indeterminate = false;
    return;
  }
  const itemCheck = event.target.closest("[data-approval-check]");
  if (itemCheck) {
    const id = itemCheck.dataset.approvalCheck;
    if (itemCheck.checked) selectedApprovals.add(id);
    else selectedApprovals.delete(id);
    syncSelectAllStates();
  }
});

$("chatForm").addEventListener("submit", sendChat);
$("newThreadBtn").addEventListener("click", () => {
  activeThreadId = "";
  renderThreadContext();
});
$("attentionBtn").addEventListener("click", attentionMajor);
const _addEmpBtn = document.getElementById("addEmployeeBtn");
if (_addEmpBtn) _addEmpBtn.addEventListener("click", openAddEmployee);
const _addEmpClose = document.getElementById("addEmpCloseBtn");
if (_addEmpClose) _addEmpClose.addEventListener("click", closeAddEmployee);
$("approvalFeedbackForm").addEventListener("submit", submitApprovalFeedback);
$("cancelApprovalFeedbackBtn").addEventListener("click", () => $("approvalFeedbackDialog").close());

async function updateEmployee(name, payload) {
  try {
    await api(`/api/employees/${encodeURIComponent(name)}`, { method: "POST", body: JSON.stringify(payload) });
    await loadState();
  } catch (err) {
    transientStatus = `Could not update ${name}: ${err.message}`;
    render();
  }
}
document.addEventListener("change", (event) => {
  const sel = event.target.closest("[data-emp-trust]");
  if (sel) updateEmployee(sel.getAttribute("data-emp-trust"), { trustLevel: sel.value });
});
document.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-emp-toggle]");
  if (!btn) return;
  const enabled = btn.getAttribute("data-enabled") === "true";
  updateEmployee(btn.getAttribute("data-emp-toggle"), { enabled: !enabled });
});

function renderCivilianBadge() {
  // Adoption Ripple moved to the Impact Ledger; the cockpit only keeps the live
  // "+N civilians working" indicator that used to live alongside it.
  const badge = $("civilianBadge");
  if (!badge) return;
  const civ = (state.jobs || []).filter((j) => j.type === "civilian" && ["queued", "in_progress"].includes(j.status)).length;
  if (civ) { badge.hidden = false; badge.textContent = `+${civ} civilians working`; }
  else { badge.hidden = true; badge.textContent = ""; }
}

function gInfo(text) {
  // Small ⓘ affordance with an accessible tooltip (hover, tap, and keyboard focus).
  const t = escapeHtml(text);
  return `<span class="g-info" tabindex="0" role="note" aria-label="${t}">i<span class="g-tip" role="tooltip">${t}</span></span>`;
}

function renderGuardrails() {
  const g = state.guardrails;
  const sumEl = $("guardrailsSummary");
  const bodyEl = $("guardrailsBody");
  if (!g || !sumEl || !bodyEl) return;
  const a = g.audit || {};
  const lc = g.levelCounts || {};
  sumEl.textContent = `${a.outwardSends || 0} outward sends · ${a.autonomousActions || 0} autonomous actions · classified always pauses`;
  const li = (items) => (items || []).map((t) => `<li>${escapeHtml(t)}</li>`).join("");
  const paused = (g.pausedEmployees || []);
  const levelRows = (g.levels || []).map((e) => {
    const cls = `trust-${e.level}`;
    const fixed = e.mode === "fixed" ? " · fixed" : "";
    const pausedTag = e.enabled ? "" : " · paused";
    return `<div class="g-level-row"><span>${escapeHtml(e.name)}</span><span class="trust-badge ${cls}">${escapeHtml((TRUST_NAME[e.level] || e.level))}${fixed}${pausedTag}</span></div>`;
  }).join("");
  const showReset = (g.adjustableAtAutonomous || []).length || (g.levels || []).some((e) => e.mode === "adjustable" && e.level !== "draft");
  bodyEl.innerHTML = `
    <p class="g-cardinal">Your level controls how far each employee goes. Draft = you send · Assist = you approve, it sends · Autonomous = it sends. Confidential / Highly-Confidential external sends always pause for you.</p>
    <div class="g-stats">
      <div class="g-stat"><span class="g-num">${a.outwardSends || 0}</span><span class="g-lab">outward sends ${gInfo("Times an employee sent something to other people (email, Teams, or an RSVP) — either on its own or after you approved it.")}</span></div>
      <div class="g-stat"><span class="g-num">${a.autonomousActions || 0}</span><span class="g-lab">autonomous actions ${gInfo("Actions an employee completed on its own, without pausing for you, within the trust level you granted it.")}</span></div>
      <div class="g-stat"><span class="g-num">${(lc.draft || 0)}/${(lc.assist || 0)}/${(lc.autonomous || 0)}</span><span class="g-lab">draft / assist / autonomous ${gInfo("How many of your employees are currently set to each trust level.")}</span></div>
      <div class="g-stat"><span class="g-num">${a.mutedByMemory || 0}</span><span class="g-lab">muted by memory ${gInfo("Items you rejected or deferred that the team is holding back so they don't keep re-surfacing (reject lasts 14 days, defer 3). Manage them in the 🔕 muted bar under the Approval inbox.")}</span></div>
    </div>
    <div class="g-cols">
      <div><h4 class="g-h">Each employee's level</h4><div class="g-levels">${levelRows}</div>
        ${showReset ? `<button type="button" class="btn g-reset" id="allToDraftBtn">Set everyone back to Draft</button>` : ""}
      </div>
      <div><h4 class="g-h ok">Always automatic</h4><ul>${li((g.policy || {}).alwaysAutomatic)}</ul>
        <h4 class="g-h warn" style="margin-top:10px;">Always pauses for you</h4><ul>${li((g.policy || {}).alwaysPausesForYou)}</ul></div>
    </div>
    <div class="g-foot">
      <span>🔒 ${escapeHtml(g.retention || "")}</span>
      <span>🏷️ ${escapeHtml(g.sensitivity || "")}</span>
      ${paused.length ? `<span>⏸️ Paused: ${escapeHtml(paused.join(", "))}</span>` : ""}
    </div>`;
  const resetBtn = $("allToDraftBtn");
  if (resetBtn) resetBtn.addEventListener("click", async () => {
    try { await api("/api/team/all-to-draft", { method: "POST", body: "{}" }); await loadState(); }
    catch (err) { transientStatus = `Could not reset: ${err.message}`; render(); }
  });
}

function renderDecisionMemory() {  const bar = $("memoryBar");
  if (!bar) return;
  const mem = state.decisionMemory || { count: 0, items: [] };
  if (!mem.count) { bar.hidden = true; bar.innerHTML = ""; return; }
  bar.hidden = false;
  // Preserve expand/collapse across the periodic state refresh: a re-rendered <details> defaults to
  // closed, which made the panel auto-collapse every ~15s. Carry the live open state forward (or the
  // saved one on first paint after a reload).
  const existing = bar.querySelector(".memory-details");
  let openState;
  if (existing) {
    openState = existing.open;
  } else {
    try { openState = localStorage.getItem("df-muted-open") === "1"; } catch (e) { openState = false; }
  }
  const items = (mem.items || []).map((m) => `
    <li>
      <span class="mem-tag mem-${escapeHtml(m.decision)}">${escapeHtml(m.decision)}</span>
      <span class="mem-subj">${escapeHtml(m.subject || "(no subject)")}</span>
      <span class="mem-from">${escapeHtml(m.sender || "")}</span>
      <button type="button" class="btn tiny" data-unmute="${escapeHtml(m.contentKey)}">Un-mute</button>
    </li>`).join("");
  bar.innerHTML = `
    <details class="memory-details"${openState ? " open" : ""}>
      <summary>🔕 ${mem.count} muted — already-dismissed items hidden from new cards
        <button type="button" class="mem-clear" data-clear-all="1">Clear all</button>
      </summary>
      <ul class="mem-list">${items}</ul>
    </details>`;
  const details = bar.querySelector(".memory-details");
  if (details) {
    details.addEventListener("toggle", () => {
      try { localStorage.setItem("df-muted-open", details.open ? "1" : "0"); } catch (e) {}
    });
  }
}
document.addEventListener("click", async (event) => {
  const un = event.target.closest("[data-unmute]");
  const all = event.target.closest("[data-clear-all]");
  if (!un && !all) return;
  event.preventDefault();
  event.stopPropagation();
  try {
    const body = all ? { clearAll: true } : { contentKey: un.getAttribute("data-unmute") };
    await api("/api/decision-memory/clear", { method: "POST", body: JSON.stringify(body) });
    await loadState();
  } catch (err) {
    transientStatus = `Could not update muted items: ${err.message}`;
    render();
  }
});

function applyTheme(name) {
  document.documentElement.setAttribute("data-theme", name);
  try { localStorage.setItem("df-theme", name); } catch (e) {}
  document.querySelectorAll("[data-theme-set]").forEach((b) => b.classList.toggle("active", b.dataset.themeSet === name));
}

(function initThemePicker() {
  const btn = document.getElementById("themeBtn");
  const menu = document.getElementById("themeMenu");
  if (!btn || !menu) return;
  const current = document.documentElement.getAttribute("data-theme") || "light";
  document.querySelectorAll("[data-theme-set]").forEach((b) => b.classList.toggle("active", b.dataset.themeSet === current));
  const close = () => { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); };
  btn.addEventListener("click", (event) => {
    event.stopPropagation();
    const willOpen = menu.hidden;
    menu.hidden = !willOpen;
    btn.setAttribute("aria-expanded", String(willOpen));
  });
  menu.addEventListener("click", (event) => {
    const option = event.target.closest("[data-theme-set]");
    if (!option) return;
    applyTheme(option.dataset.themeSet);
    close();
  });
  document.addEventListener("click", (event) => {
    if (!menu.hidden && !menu.contains(event.target) && event.target !== btn) close();
  });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") close(); });
})();

function setupCollapsibles() {
  // Persisted collapse for any <section data-collapsible id="..."> with a .collapse-toggle.
  document.querySelectorAll("section[data-collapsible]").forEach((sec) => {
    const id = sec.id;
    const toggle = sec.querySelector(".collapse-toggle");
    if (!id || !toggle) return;
    const key = `df-collapse-${id}`;
    let collapsed = false;
    try { collapsed = localStorage.getItem(key) === "1"; } catch (e) {}
    const apply = () => {
      sec.classList.toggle("collapsed", collapsed);
      toggle.setAttribute("aria-expanded", String(!collapsed));
      toggle.title = collapsed ? "Expand" : "Collapse";
    };
    apply();
    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      collapsed = !collapsed;
      try { localStorage.setItem(key, collapsed ? "1" : "0"); } catch (e) {}
      apply();
    });
  });
}
setupCollapsibles();

loadState();
let events = null;
if ("EventSource" in window) {
  events = new EventSource("/api/events");
  events.onmessage = () => loadState();
  events.onerror = () => setTimeout(loadState, 1000);
  window.addEventListener("pagehide", () => events.close());
}
setInterval(loadState, 15000);
