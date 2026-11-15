// verifyEngr — the "brain" of the website.
// It loads the sample engineers and shows matches as you type.

const DATA_FILE = "../data/sample-engineers.json";

let engineers = [];

// 1. Load the engineer list
fetch(DATA_FILE)
  .then((response) => response.json())
  .then((data) => {
    engineers = data;
  })
  .catch(() => {
    console.log("Could not load data. Try opening the site with Live Server.");
  });

// 2. Search as the user types
const searchBox = document.getElementById("search");
const resultsBox = document.getElementById("results");

if (searchBox) {
  searchBox.addEventListener("input", () => {
    const text = searchBox.value.trim().toLowerCase();
    resultsBox.innerHTML = "";
    if (text === "") return;

    const matches = engineers.filter(
      (e) =>
        e.fullName.toLowerCase().includes(text) ||
        e.corenNumber.toLowerCase().includes(text)
    );

    // 3. No match: show a careful warning, not a "fake" verdict
    if (matches.length === 0) {
      resultsBox.innerHTML =
        '<p class="badge-notfound">Not found in our records — verify with COREN before hiring.</p>';
      return;
    }

    // 4. Show each match
    matches.forEach((e) => {
      const badge = e.status === "Registered" ? "badge-registered" : "badge-expired";
      resultsBox.innerHTML += `
        <div class="result">
          <strong>${e.fullName}</strong> — <span class="${badge}">${e.status}</span><br>
          ${e.discipline} engineer · ${e.yearsOfExperience} years · ${e.state}<br>
          COREN no: ${e.corenNumber}
        </div>`;
    });
  });
}
