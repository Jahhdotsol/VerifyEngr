// verifyEngr — the "brain" of the website.
// It loads the sample engineers and powers:
//   - Home page: quick verify, search, filters, browse all
//   - Profile page: details, email, share, report a problem

// ---------- Settings you can change ----------

const DATA_FILE = "../data/sample-engineers.json";

// Where "Report a problem" emails go. Change this to your team's email.
const REPORT_EMAIL = "report@example.com";

// ---------- Helpers ----------

// Makes text safe to put on the page
function safe(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Picks the colour style for each status
function badgeClass(status) {
  if (status === "Registered") return "badge badge-registered";
  if (status === "Expired") return "badge badge-expired";
  return "badge badge-suspended"; // Suspended or anything else
}

// Makes COREN numbers easy to compare: "sample 01037" -> "SAMPLE01037"
function cleanNumber(text) {
  return String(text).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// Loads the engineer list, then runs the page's code
function loadEngineers(callback) {
  fetch(DATA_FILE)
    .then((response) => response.json())
    .then(callback)
    .catch(() => {
      const box = document.getElementById("results") || document.getElementById("profile");
      if (box) {
        box.innerHTML =
          '<p class="alert alert-bad">Could not load the engineer list. Open the site with Live Server (see README).</p>';
      }
    });
}

// One engineer as a clickable card
function engineerCard(e) {
  return `
    <a class="result" href="profile.html?id=${e.id}">
      <strong>${safe(e.fullName)}</strong>
      <span class="${badgeClass(e.status)}">${safe(e.status)}</span><br>
      ${safe(e.discipline)} engineer · ${e.yearsOfExperience} years · ${safe(e.city)}, ${safe(e.state)}<br>
      <span class="note">COREN no: ${safe(e.corenNumber)}</span>
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

// 1. Quick verify: one COREN number -> one clear answer
function setUpQuickVerify(engineers) {
  const form = document.getElementById("verify-form");
  const input = document.getElementById("verify-input");
  const box = document.getElementById("verify-result");

  form.addEventListener("submit", (event) => {
    event.preventDefault(); // stop the page from reloading
    const wanted = cleanNumber(input.value);
    const e = engineers.find((x) => cleanNumber(x.corenNumber) === wanted);

    if (!e) {
      box.innerHTML = `
        <div class="verdict verdict-bad">
          <p class="verdict-title">❌ Not found</p>
          <p>"${safe(input.value)}" is not in our records. This does not prove the person is fake, but
          <strong>do not hire until you confirm with COREN</strong>.</p>
        </div>`;
      return;
    }

    const looks = {
      Registered: ["verdict-good", "✅ Registered", "This engineer is currently registered."],
      Expired: ["verdict-warn", "⚠️ Registration expired", "Do not hire until they renew with COREN."],
    };
    const [style, title, advice] = looks[e.status] || [
      "verdict-bad",
      `⛔ ${e.status}`,
      "Do not hire. Confirm with COREN first.",
    ];

    box.innerHTML = `
      <div class="verdict ${style}">
        <p class="verdict-title">${safe(title)}</p>
        <p><strong>${safe(e.fullName)}</strong> · ${safe(e.discipline)} · ${safe(e.state)}</p>
        <p>${safe(advice)}</p>
        <a href="profile.html?id=${e.id}">View full profile →</a>
      </div>`;
  });
}

// 2. Search + filters + browse all
function setUpSearch(engineers) {
  const searchBox = document.getElementById("search");
  const disciplineBox = document.getElementById("filter-discipline");
  const stateBox = document.getElementById("filter-state");

  // Fill the dropdowns from the data, in A–Z order
  const fill = (select, values) => {
    [...new Set(values)].sort().forEach((v) => {
      select.innerHTML += `<option value="${safe(v)}">${safe(v)}</option>`;
    });
  };
  fill(disciplineBox, engineers.map((e) => e.discipline));
  fill(stateBox, engineers.map((e) => e.state));

  function show() {
    const text = searchBox.value.trim().toLowerCase();
    const discipline = disciplineBox.value;
    const state = stateBox.value;

    const matches = engineers
      .filter((e) => !discipline || e.discipline === discipline)
      .filter((e) => !state || e.state === state)
      .filter((e) =>
        [e.fullName, e.corenNumber, e.discipline, e.state, e.city].join(" ").toLowerCase().includes(text)
      )
      .sort((a, b) => a.fullName.localeCompare(b.fullName));

    if (matches.length === 0) {
      resultsBox.innerHTML =
        '<p class="alert alert-bad">Not found in our records — verify with COREN before hiring.</p>';
      return;
    }

    const browsing = !text && !discipline && !state;
    const label = browsing
      ? `Showing all ${matches.length} engineers`
      : `${matches.length} result${matches.length === 1 ? "" : "s"}`;

    resultsBox.innerHTML = `<p class="note">${label}</p>` + matches.map(engineerCard).join("");
  }

  searchBox.addEventListener("input", show);
  disciplineBox.addEventListener("change", show);
  stateBox.addEventListener("change", show);
  show(); // show everyone when the page first opens
}

// ---------- Profile page ----------

const profileBox = document.getElementById("profile");

if (profileBox) {
  loadEngineers((engineers) => {
    // Read the id from the web address, e.g. profile.html?id=3
    const id = Number(new URLSearchParams(window.location.search).get("id"));
    const e = engineers.find((x) => x.id === id);

    if (!e) {
      profileBox.innerHTML =
        '<p class="alert alert-bad">Engineer not found in our records — verify with COREN before hiring.</p>';
      return;
    }

    document.title = `${e.fullName} — verifyEngr`;
    const pageLink = window.location.href;

    const warning =
      e.status === "Registered"
        ? ""
        : `<p class="alert alert-bad">This engineer's registration is <strong>${safe(e.status.toLowerCase())}</strong>. Do not hire until it is confirmed with COREN.</p>`;

    // Email button only for engineers who are currently registered
    const emailButton =
      e.status === "Registered" && e.email
        ? `<a class="button" href="mailto:${safe(e.email)}?subject=${encodeURIComponent("Enquiry via verifyEngr")}">Email this engineer</a>`
        : "";

    // Share on WhatsApp with a ready-made message
    const shareText = `${e.fullName} (COREN ${e.corenNumber}) is ${e.status} on verifyEngr: ${pageLink}`;
    const whatsappLink = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

    // Report a problem by email, with details filled in
    const reportLink =
      `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(`Report: ${e.fullName} (${e.corenNumber})`)}` +
      `&body=${encodeURIComponent(`Profile: ${pageLink}\n\nWhat is wrong? `)}`;

    profileBox.innerHTML = `
      <h1>${safe(e.fullName)}</h1>
      <p class="${badgeClass(e.status)} badge-large">${safe(e.status)}</p>
      ${warning}

      <div class="actions">
        ${emailButton}
        <a class="button button-light" href="${whatsappLink}" target="_blank" rel="noopener">Share on WhatsApp</a>
        <button class="button button-light" id="copy-link" type="button">Copy link</button>
      </div>

      <dl class="details">
        <dt>COREN number</dt><dd>${safe(e.corenNumber)}</dd>
        <dt>Discipline</dt><dd>${safe(e.discipline)}</dd>
        <dt>Experience</dt><dd>${e.yearsOfExperience} years</dd>
        <dt>Registered since</dt><dd>${e.registeredSince}</dd>
        <dt>Location</dt><dd>${safe(e.city)}, ${safe(e.state)}</dd>
        <dt>Works with</dt><dd>${safe(e.employer)}</dd>
        <dt>Email</dt><dd>${e.email ? `<a href="mailto:${safe(e.email)}">${safe(e.email)}</a>` : "Not listed"}</dd>
      </dl>

      <h2>Past projects</h2>
      <ul>${e.pastProjects.map((p) => `<li>${safe(p)}</li>`).join("")}</ul>

      <p class="note">Last checked: ${safe(e.lastChecked)} · Source: ${safe(e.source)}</p>
      <p><a class="report-link" href="${reportLink}">⚑ Report a problem with this listing</a></p>`;

    // Copy link button
    document.getElementById("copy-link").addEventListener("click", (event) => {
      const button = event.target;
      navigator.clipboard
        .writeText(pageLink)
        .then(() => (button.textContent = "Link copied ✓"))
        .catch(() => (button.textContent = "Copy failed — copy from the address bar"));
    });
  });
}
