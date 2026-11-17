# verifyEngr

**Check if an engineer is registered with COREN — in under a minute.**

verifyEngr is a simple website where anyone (a homeowner, developer or inspector) can search for an engineer by name or COREN number and see:

- whether they are registered (Registered / Expired / Suspended / Not found)
- their discipline (e.g. structural, civil)
- their years of experience
- their state and past projects

> This is a hackathon project. All data in this version is **sample data** modelled on COREN and NSE records. It is not real registration data.

---

## Folder structure

```
verifyEngr/
├── README.md          ← You are here. What the project is and how to use it.
├── .env.example       ← A template of private settings (keys, links). Copy it to .env.
├── .gitignore         ← Tells Git which files NOT to upload (like your real .env).
├── index.html         ← Sends visitors from the main link to the website folder.
├── 404.html           ← "Page not found" page for broken links.
├── .nojekyll          ← Tells GitHub Pages to publish the files exactly as they are.
│
├── website/           ← Everything people see in the browser.
│   ├── index.html     ← Home page: quick verify, why it matters, search and filters.
│   ├── profile.html   ← One engineer's verification record (certificate style).
│   ├── about.html     ← About page: the problem, mission and data.
│   ├── privacy.html   ← Privacy and disclaimer.
│   ├── css/
│   │   └── styles.css ← Colours, fonts, layout and animations.
│   ├── js/
│   │   ├── app.js     ← The logic: verify, search, filters, profile.
│   │   └── motion.js  ← Scroll animations, 3D building, card tilt.
│   ├── fonts/         ← Bundled fonts and their licences.
│   └── images/        ← Logo and the link-preview image (og-image.jpg).
│
├── data/              ← The information the website shows.
│   └── sample-engineers.json  ← Sample engineer listings (not real people).
│
└── docs/              ← Planning and hackathon documents.
    └── README.md      ← Links to the PRD, pitch notes and judging criteria.
```

### What each folder is for

| Folder | In plain words | You'll touch it when… |
| --- | --- | --- |
| `website/` | The actual website — the pages, how they look, and how they work | You change a page, a colour, or the search |
| `website/css/` | The "paint and decoration" of the site | You change colours, fonts or spacing |
| `website/js/` | The "brain" (app.js) and the animations (motion.js) | You change how search, verify or the motion works |
| `website/images/` | Pictures used on the site | You add a logo or icon |
| `data/` | The list of engineers the site searches | You add or edit sample engineers |
| `docs/` | Notes and plans — not part of the website | You update the PRD or pitch |

---

## Live website

- **Main:** https://verifyengr.vercel.app
- Backup (GitHub Pages): https://jahhdotsol.github.io/VerifyEngr/

## How to run it on your computer

No installation needed.

1. Open the `website` folder.
2. Double-click `index.html` to open it in your browser.

> Tip: some browsers block loading the data file when you double-click. If search shows nothing, use the free **Live Server** extension in VS Code: right-click `index.html` → **Open with Live Server**.

---

## Change the report email

Reports go to momoh_elijah@yahoo.com. To change this, edit `REPORT_EMAIL` near the top of `website/js/app.js`, and the email links in the footers and on `privacy.html`.

## Settings (.env)

`.env.example` lists the private settings the project will need later (for example, keys to connect to real COREN and NSE data).

1. Make a copy of `.env.example` and name it `.env`.
2. Fill in your own values.
3. **Never share or upload `.env`** — it is already listed in `.gitignore`.

For the hackathon, you don't need to fill anything in; the site uses sample data.

---

## Hackathon details

- **Deadline:** 27 November 2026
- **Scope (MVP):** website, engineers only, sample COREN/NSE data
- **Next phase:** consultants and construction companies; real data through a COREN/NSE partnership

See `docs/README.md` for the full plan.
