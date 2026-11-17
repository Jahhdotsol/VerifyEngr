// verifyEngr — the "brain" of the website.
//   Home page:    quick verify, search, filters, engineer cards
//   Profile page: verification record (certificate), share, report
// Animations live in js/motion.js.

// ---------- Settings you can change ----------

const CONFIG = window.VERIFYENGR_CONFIG || {};          // from js/config.js
const API = CONFIG.SUPABASE_URL ? `${CONFIG.SUPABASE_URL}/rest/v1` : null;
const API_HEADERS = { apikey: CONFIG.SUPABASE_KEY, "Content-Type": "application/json" };
const BACKUP_FILE = "../data/sample-engineers.json";    // used only if the database can't be reached
const REPORT_EMAIL = "momoh_elijah@yahoo.com";          // fallback if a report can't be saved
const CARDS_PER_PAGE = 9;                      // cards shown before "Show more"

// ---------- Helpers ----------

// Makes text safe to put on the page
function safe(text) {
  return String(text)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// "Registered" -> "registered" (used for colours)
const statusKey = (status) => String(status).toLowerCase();

// "Engr. Ngozi Okeke" -> "NO"
function initials(name) {
  return name.replace(/^Engr\.\s*/, "").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

// A pair of colours picked from the name, so each avatar looks different
const AVATAR_COLOURS = [["#2348e8", "#8fa4ff"], ["#0f766e", "#5eead4"], ["#7c3aed", "#c4b5fd"], ["#b45309", "#fcd34d"], ["#be185d", "#f9a8d4"], ["#1d4ed8", "#67e8f9"]];
function avatarColours(name) {
  let n = 0;
  for (const ch of name) n = (n * 31 + ch.charCodeAt(0)) % 9973;
  return AVATAR_COLOURS[n % AVATAR_COLOURS.length];
}

// Small line icons for each discipline
const ICONS = {
  Structural: '<path d="M5 5h14M5 19h14M12 5v14"/>',
  Civil: '<path d="M3 18h18M5 18v-6M19 18v-6M3 12c4-6 14-6 18 0M9 18v-4.5M15 18v-4.5"/>',
  Geotechnical: '<path d="M3 7c3-2 6 2 9 0s6 2 9 0M3 12c3-2 6 2 9 0s6 2 9 0M3 17h18"/>',
  Electrical: '<path d="M13 2 5 14h6l-1 8 8-12h-6z"/>',
  Mechanical: '<circle cx="12" cy="12" r="3.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  "Building Services": '<path d="M4 6h7a4 4 0 0 1 4 4v10M4 10h5a2 2 0 0 1 2 2v8M18 4v4M16 6h4"/>',
};
function icon(discipline) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[discipline] || ICONS.Structural}</svg>`;
}

// Status icons used in the verify answer and the seal
const STATUS_ICON = {
  good: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 6v8M12 18.5v.5"/></svg>',
  bad: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="m7 7 10 10M17 7 7 17"/></svg>',
};

// Makes COREN numbers easy to compare: "sample 01037" -> "SAMPLE01037"
const cleanNumber = (text) => String(text).toUpperCase().replace(/[^A-Z0-9]/g, "");

// True if two words are the same or one letter apart ("strucural" ~ "structural")
function closeEnough(a, b) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1 || a.length < 4) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

// Does an engineer match what was typed? Every typed word must match something.
function matches(e, text) {
  if (!text) return true;
  const hay = [e.fullName, e.corenNumber, e.discipline, e.state, e.city].join(" ").toLowerCase();
  if (hay.includes(text)) return true;
  const words = hay.split(/[^a-z0-9]+/).filter(Boolean);
  return text.split(/\s+/).every((t) => hay.includes(t) || words.some((w) => closeEnough(t, w) || (w.startsWith(t.slice(0, -1)) && t.length > 4)));
}

// Turns a database row (full_name) into the shape the site uses (fullName)
function fromRow(r) {
  return {
    id: r.id, fullName: r.full_name, corenNumber: r.coren_number, status: r.status,
    discipline: r.discipline, yearsOfExperience: r.years_of_experience, registeredSince: r.registered_since,
    state: r.state, city: r.city, employer: r.employer, email: r.email,
    pastProjects: r.past_projects || [], lastChecked: r.last_checked, source: r.source,
  };
}

// Loads the engineer list from Supabase (or the backup file), then runs the page's code
async function fetchEngineers() {
  if (API) {
    try {
      const res = await fetch(`${API}/engineers?select=*&order=id`, { headers: API_HEADERS });
      if (res.ok) return (await res.json()).map(fromRow);
      console.warn("Supabase answered", res.status, "- using the backup file");
    } catch (err) {
      console.warn("Supabase could not be reached - using the backup file", err);
    }
  }
  const res = await fetch(BACKUP_FILE);
  if (!res.ok) throw new Error("No engineer data");
  return res.json();
}

function loadEngineers(callback) {
  fetchEngineers()
    .then(callback)
    .catch(() => {
      const box = document.getElementById("results") || document.getElementById("profile");
      if (box) box.innerHTML = '<p class="empty">The engineer list could not load. Check your connection and refresh the page.</p>';
    });
}

// Saves a report in the database. Visitors can send reports but cannot read them.
async function sendReport(report) {
  if (!API) throw new Error("No database configured");
  const res = await fetch(`${API}/reports`, {
    method: "POST",
    headers: { ...API_HEADERS, Prefer: "return=minimal" },
    body: JSON.stringify(report),
  });
  if (!res.ok) throw new Error(`Report not saved (${res.status})`);
}

// One engineer as a card
function engineerCard(e, i) {
  const [c1, c2] = avatarColours(e.fullName);
  const key = statusKey(e.status);
  return `
    <a class="lcard ${key} tilt" href="profile.html?id=${e.id}" style="--i:${i % CARDS_PER_PAGE}">
      <div class="lc-top">
        <span class="avatar" style="--av1:${c1};--av2:${c2}" aria-hidden="true">${initials(e.fullName)}</span>
        <span class="badge ${key}">${safe(e.status)}</span>
      </div>
      <h3 class="lc-name">${safe(e.fullName)}</h3>
      <p class="lc-disc">${icon(e.discipline)} ${safe(e.discipline)} engineer</p>
      <dl class="lc-meta">
        <div><dt>Experience</dt><dd>${e.yearsOfExperience} years</dd></div>
        <div><dt>Location</dt><dd>${safe(e.state)}</dd></div>
      </dl>
      <p class="lc-num">COREN ${safe(e.corenNumber)}</p>
    </a>`;
}

// ---------- Home page ----------

const resultsBox = document.getElementById("results");

if (resultsBox) {
  loadEngineers((engineers) => {
    setUpQuickVerify(engineers);
    setUpSearch(engineers);
  });
}

// Quick verify: one COREN number -> one clear answer
function setUpQuickVerify(engineers) {
  const form = document.getElementById("verify-form");
  const input = document.getElementById("verify-input");
  const box = document.getElementById("verify-result");

  // "Try a sample" chips fill the box and verify
  document.querySelectorAll("[data-try]").forEach((chip) =>
    chip.addEventListener("click", () => { input.value = chip.dataset.try; form.requestSubmit(); })
  );

  form.addEventListener("submit", (event) => {
    event.preventDefault(); // stop the page from reloading
    const typed = input.value.trim();
    const e = engineers.find((x) => cleanNumber(x.corenNumber) === cleanNumber(typed));

    let tone, title, who, advice, link = "";
    if (!e) {
      tone = "bad"; title = "Not found";
      who = `"${safe(typed)}" is not in our records.`;
      advice = "This does not prove the person is fake, but do not hire until you confirm with COREN.";
    } else {
      tone = e.status === "Registered" ? "good" : e.status === "Expired" ? "warn" : "bad";
      title = e.status === "Expired" ? "Registration expired" : e.status;
      who = `${safe(e.fullName)}, ${safe(e.discipline)} engineer, ${safe(e.state)}`;
      advice = e.status === "Registered" ? "This engineer is currently registered." :
        e.status === "Expired" ? "Do not hire until they renew with COREN." : "Do not hire. Confirm with COREN first.";
      link = `<a href="profile.html?id=${e.id}">View verification record</a>`;
    }

    box.innerHTML = `
      <div class="verdict ${tone}" role="status">
        <span class="v-icon">${STATUS_ICON[tone]}</span>
        <p class="v-title">${safe(title)}</p>
        <p class="v-who">${who}</p>
        <p class="v-advice">${advice}</p>
        ${link}
      </div>`;
  });
}

// Search + filters + cards
function setUpSearch(engineers) {
  const searchBox = document.getElementById("search");
  const disciplineBox = document.getElementById("filter-discipline");
  const stateBox = document.getElementById("filter-state");
  const countBox = document.getElementById("result-count");
  const moreBox = document.getElementById("more");
  let shown = CARDS_PER_PAGE;

  // Fill the dropdowns from the data, A–Z
  const fill = (select, values) =>
    [...new Set(values)].sort().forEach((v) => select.insertAdjacentHTML("beforeend", `<option value="${safe(v)}">${safe(v)}</option>`));
  fill(disciplineBox, engineers.map((e) => e.discipline));
  fill(stateBox, engineers.map((e) => e.state));

  function show(resetPaging) {
    if (resetPaging) shown = CARDS_PER_PAGE;
    const text = searchBox.value.trim().toLowerCase();
    const list = engineers
      .filter((e) => !disciplineBox.value || e.discipline === disciplineBox.value)
      .filter((e) => !stateBox.value || e.state === stateBox.value)
      .filter((e) => matches(e, text))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));

    if (list.length === 0) {
      countBox.textContent = "No matches";
      resultsBox.innerHTML = '<p class="empty">No engineer in our records matches that. Check the spelling or clear a filter. If you were given this name, verify with COREN before hiring.</p>';
      moreBox.innerHTML = "";
      return;
    }

    const browsing = !text && !disciplineBox.value && !stateBox.value;
    countBox.textContent = browsing ? `Showing ${Math.min(shown, list.length)} of ${list.length} sample engineers` : `${list.length} match${list.length === 1 ? "" : "es"}`;
    resultsBox.innerHTML = list.slice(0, shown).map(engineerCard).join("");
    moreBox.innerHTML = list.length > shown ? `<button class="btn btn-ghost" type="button">Show ${Math.min(CARDS_PER_PAGE, list.length - shown)} more</button>` : "";
    const btn = moreBox.querySelector("button");
    if (btn) btn.addEventListener("click", () => { shown += CARDS_PER_PAGE; show(false); });
    document.dispatchEvent(new CustomEvent("cards:updated"));
  }

  searchBox.addEventListener("input", () => show(true));
  disciplineBox.addEventListener("change", () => show(true));
  stateBox.addEventListener("change", () => show(true));
  show(true);
}

// ---------- Profile page: verification record ----------

const profileBox = document.getElementById("profile");

if (profileBox) {
  loadEngineers((engineers) => {
    // Read the id from the web address, e.g. profile.html?id=3
    const id = Number(new URLSearchParams(window.location.search).get("id"));
    const e = engineers.find((x) => x.id === id);

    if (!e) {
      profileBox.innerHTML = '<p class="alert">This engineer is not in our records. Check the link, or verify with COREN before hiring.</p>';
      return;
    }

    document.title = `${e.fullName} — verifyEngr`;
    const pageLink = window.location.href;
    const key = statusKey(e.status);
    const tone = key === "registered" ? "good" : key === "expired" ? "warn" : "bad";

    const warning = key === "registered" ? "" :
      `<p class="alert ${key === "expired" ? "warn" : ""}">This engineer's registration is <strong>${safe(key)}</strong>. Do not hire until it is confirmed with COREN.</p>`;

    const emailButton = key === "registered" && e.email
      ? `<a class="btn" href="mailto:${safe(e.email)}?subject=${encodeURIComponent("Enquiry via verifyEngr")}">Email this engineer</a>` : "";
    const shareText = `${e.fullName} (COREN ${e.corenNumber}) is ${e.status} on verifyEngr: ${pageLink}`;
    const reportLink = `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(`Report: ${e.fullName} (${e.corenNumber})`)}&body=${encodeURIComponent(`Profile: ${pageLink}\n\nWhat is wrong? `)}`;

    profileBox.innerHTML = `
      ${warning}
      <div class="cert-stage">
        <article class="cert enter tilt" aria-label="Verification record for ${safe(e.fullName)}">
          <svg class="guilloche" aria-hidden="true"></svg>
          <div class="cert-inner">
            <div class="watermark" aria-hidden="true">Sample</div>
            <header class="cert-head">
              <div class="cert-brand"><img src="images/logo.svg" alt=""><div><b>verifyEngr</b><span>Engineer verification record</span></div></div>
              <p class="cert-no">Record number<b>${safe(e.corenNumber)}</b></p>
            </header>

            <div class="cert-body">
              <div>
                <p class="cert-intro">This record shows that</p>
                <h1 class="cert-name">${safe(e.fullName)}</h1>
                <p class="cert-line">is listed as a <strong>${safe(e.discipline)}</strong> engineer with <strong>${e.yearsOfExperience} years</strong> of experience, based in ${safe(e.city)}, ${safe(e.state)}, and a COREN registration status of <strong>${safe(e.status)}</strong>.</p>
              </div>
              <div class="seal ${key}" role="img" aria-label="Status: ${safe(e.status)}">
                <svg class="seal-ring" viewBox="0 0 200 200" aria-hidden="true">
                  <defs><path id="sealPath" d="M100,100 m-82,0 a82,82 0 1,1 164,0 a82,82 0 1,1 -164,0"/></defs>
                  <circle cx="100" cy="100" r="96" fill="none" stroke="currentColor" stroke-width="1.5"/>
                  <circle cx="100" cy="100" r="70" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="2 4"/>
                  <text><textPath href="#sealPath">VERIFYENGR · ENGINEER RECORD · SAMPLE DATA ·</textPath></text>
                </svg>
                <div class="seal-core">${STATUS_ICON[tone]}<b>${safe(e.status)}</b></div>
              </div>
            </div>

            <dl class="titleblock">
              <div><dt>COREN number</dt><dd>${safe(e.corenNumber)}</dd></div>
              <div><dt>Discipline</dt><dd>${safe(e.discipline)}</dd></div>
              <div><dt>Experience</dt><dd>${e.yearsOfExperience} years</dd></div>
              <div><dt>Registered since</dt><dd>${e.registeredSince}</dd></div>
              <div><dt>Location</dt><dd>${safe(e.city)}, ${safe(e.state)}</dd></div>
              <div><dt>Works with</dt><dd>${safe(e.employer)}</dd></div>
              <div><dt>Email</dt><dd>${e.email ? `<a href="mailto:${safe(e.email)}">${safe(e.email)}</a>` : "Not listed"}</dd></div>
              <div><dt>Last checked</dt><dd>${safe(e.lastChecked)}</dd></div>
            </dl>

            <div class="cert-foot">
              <span>Sample data. This is not an official COREN certificate. Always confirm with COREN before hiring.</span>
              <span class="sig">verifyEngr</span>
            </div>
          </div>
          <div class="cert-sheen" aria-hidden="true"></div>
        </article>
      </div>

      <div class="actions">
        ${emailButton}
        <a class="btn btn-wa" href="https://wa.me/?text=${encodeURIComponent(shareText)}" target="_blank" rel="noopener">Share on WhatsApp</a>
        <button class="btn btn-ghost" id="copy-link" type="button">Copy link</button>
        <button class="report-link" id="report-toggle" type="button" aria-expanded="false" aria-controls="report-form">Report a problem with this record</button>
      </div>

      <form class="report-form" id="report-form" hidden>
        <h2>Report a problem</h2>
        <p class="note">Tell us what is wrong with this record, for example a wrong status, a fake listing or someone using this name. Only the verifyEngr team can read reports.</p>
        <label for="report-message">What is wrong?</label>
        <textarea id="report-message" required minlength="5" maxlength="2000" rows="4" placeholder="Describe the problem"></textarea>
        <label for="report-email">Your email (optional, so we can follow up)</label>
        <input id="report-email" type="email" maxlength="254" placeholder="you@example.com">
        <div class="report-actions">
          <button class="btn" type="submit">Send report</button>
          <a href="${reportLink}">Or send it by email</a>
        </div>
        <p class="report-status" id="report-status" role="status"></p>
      </form>

      <section class="projects" aria-labelledby="proj-title">
        <h2 id="proj-title" class="display">Past projects</h2>
        <ol class="timeline">
          ${e.pastProjects.map((p) => { const [what, where] = p.split(/,\s*(?=[^,]+$)/); return `<li>${safe(what)}<span>${safe(where || "")}</span></li>`; }).join("")}
        </ol>
      </section>`;

    drawGuilloche(profileBox.querySelector(".guilloche"));
    setUpReportForm(e);

    document.getElementById("copy-link").addEventListener("click", (event) => {
      const button = event.currentTarget;
      navigator.clipboard.writeText(pageLink)
        .then(() => (button.textContent = "Link copied"))
        .catch(() => (button.textContent = "Copy from the address bar"));
    });
    document.dispatchEvent(new CustomEvent("cards:updated"));
  });
}

// Draws the fine wavy security border around the certificate
function drawGuilloche(svg) {
  const W = 1000, H = 700, inset = 9;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("preserveAspectRatio", "none");
  const per = 2 * (W + H - 4 * inset);
  // point on the border at distance s, plus the inward direction
  const at = (s) => {
    const w = W - 2 * inset, h = H - 2 * inset;
    s = ((s % per) + per) % per;
    if (s < w) return [inset + s, inset, 0, 1];
    s -= w; if (s < h) return [W - inset, inset + s, -1, 0];
    s -= h; if (s < w) return [W - inset - s, H - inset, 0, -1];
    s -= w; return [inset, H - inset - s, 1, 0];
  };
  let paths = "";
  for (let k = 0; k < 4; k++) {
    let d = "";
    for (let s = 0; s <= per; s += 3) {
      const [x, y, nx, ny] = at(s);
      const off = 4.5 + 3.8 * Math.sin(s / 11 + k * 1.57) * Math.cos(s / 37);
      d += (s === 0 ? "M" : "L") + (x + nx * off).toFixed(1) + " " + (y + ny * off).toFixed(1);
    }
    paths += `<path d="${d}Z" fill="none" stroke="${k % 2 ? "#8fa4ff" : "#2348e8"}" stroke-opacity=".55" stroke-width=".7" vector-effect="non-scaling-stroke"/>`;
  }
  svg.innerHTML = paths;
}

// "Report a problem" form on the profile page
function setUpReportForm(e) {
  const toggle = document.getElementById("report-toggle");
  const form = document.getElementById("report-form");
  const status = document.getElementById("report-status");
  const button = form.querySelector("button[type=submit]");

  toggle.addEventListener("click", () => {
    form.hidden = !form.hidden;
    toggle.setAttribute("aria-expanded", String(!form.hidden));
    if (!form.hidden) { form.scrollIntoView({ behavior: "smooth", block: "center" }); document.getElementById("report-message").focus({ preventScroll: true }); }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = document.getElementById("report-message").value.trim();
    const email = document.getElementById("report-email").value.trim();
    if (message.length < 5) { status.className = "report-status bad"; status.textContent = "Write at least a few words about the problem."; return; }

    button.disabled = true; button.textContent = "Sending…";
    try {
      await sendReport({ engineer_id: e.id, coren_number: e.corenNumber, message, reporter_email: email || null });
      form.reset();
      status.className = "report-status good";
      status.textContent = "Report sent. Thank you, we will review this record.";
      button.textContent = "Report sent";
    } catch (err) {
      status.className = "report-status bad";
      status.innerHTML = `Your report could not be sent. Please email it to <a href="mailto:${REPORT_EMAIL}">${REPORT_EMAIL}</a> instead.`;
      button.disabled = false; button.textContent = "Send report";
    }
  });
}
