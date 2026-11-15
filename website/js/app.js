// verifyEngr — the "brain" of the website.
// It loads the sample engineers, runs the search on the home page,
// and fills in the details on the profile page.

const DATA_FILE = "../data/sample-engineers.json";

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

// Loads the engineer list, then runs the page's code
function loadEngineers(callback) {
  fetch(DATA_FILE)
    .then((response) => response.json())
    .then(callback)
    .catch(() => {
      const box = document.getElementById("results") || document.getElementById("profile");
      if (box) {
        box.innerHTML =
          '<p class="badge-notfound">Could not load the engineer list. Open the site with Live Server (see README).</p>';
      }
    });
}

// ---------- Home page: search ----------

const searchBox = document.getElementById("search");
const resultsBox = document.getElementById("results");

if (searchBox) {
  loadEngineers((engineers) => {
    searchBox.addEventListener("input", () => {
      const text = searchBox.value.trim().toLowerCase();
      resultsBox.innerHTML = "";
      if (text === "") return;

      const matches = engineers.filter((e) =>
        [e.fullName, e.corenNumber, e.discipline, e.state, e.city]
          .join(" ")
          .toLowerCase()
          .includes(text)
      );

      // No match: a careful warning, not a "fake" verdict
      if (matches.length === 0) {
        resultsBox.innerHTML =
          '<p class="badge-notfound">Not found in our records — verify with COREN before hiring.</p>';
        return;
      }

      resultsBox.innerHTML = `<p class="note">${matches.length} result${matches.length === 1 ? "" : "s"}</p>`;

      // Each result links to its profile page
      matches.forEach((e) => {
        resultsBox.innerHTML += `
          <a class="result" href="profile.html?id=${e.id}">
            <strong>${safe(e.fullName)}</strong>
            <span class="${badgeClass(e.status)}">${safe(e.status)}</span><br>
            ${safe(e.discipline)} engineer · ${e.yearsOfExperience} years · ${safe(e.city)}, ${safe(e.state)}<br>
            <span class="note">COREN no: ${safe(e.corenNumber)}</span>
          </a>`;
      });
    });
  });
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
        '<p class="badge-notfound">Engineer not found in our records — verify with COREN before hiring.</p>';
      return;
    }

    document.title = `${e.fullName} — verifyEngr`;

    const warning =
      e.status === "Registered"
        ? ""
        : `<p class="warning">This engineer's registration is <strong>${safe(e.status.toLowerCase())}</strong>. Do not hire until it is confirmed with COREN.</p>`;

    // Only show the email button for engineers who are currently registered
    const contact =
      e.status === "Registered" && e.email
        ? `<a class="button" href="mailto:${safe(e.email)}?subject=${encodeURIComponent("Enquiry via verifyEngr")}">Email this engineer</a>`
        : "";

    profileBox.innerHTML = `
      <h1>${safe(e.fullName)}</h1>
      <p class="${badgeClass(e.status)} badge-large">${safe(e.status)}</p>
      ${warning}
      ${contact}

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

      <p class="note">Last checked: ${safe(e.lastChecked)} · Source: ${safe(e.source)}</p>`;
  });
}
