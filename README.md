# Digital Logbook

A web app where students fill in college PDF templates (logbooks, practical records) in the browser,
save them under their account, reopen them later, and download the finished PDF.

- **Frontend:** React + Vite, with [pdf.js](https://github.com/mozilla/pdf.js) to show the PDF
- **Backend:** Node.js 22 + Express, with [pdf-lib](https://pdf-lib.js.org/) to check uploads and create the final PDF
- **Storage:** plain files on the local disk (`server/data/`), no database to install
- **Login:** a simple stub with demo users

---

## 1. Setup and run locally

### What you need

| Tool | Version | Check with |
|---|---|---|
| Node.js (includes npm) | 22 or newer | `node -v` |
| A web browser | Chrome, Edge, Firefox or Safari | |

No database, Docker or other service is needed. Download Node.js from https://nodejs.org if you don't have it.
If you use `nvm`, run `nvm use` in the project folder (the `.nvmrc` file selects Node 22).

### Step by step

1. **Get the code.** Unzip `digital-logbook.zip` into a **new, empty folder** and open a terminal in it.
   Don't unzip over an older copy: leftover `node_modules` from an old version cause "Cannot find package" errors.
2. **Install everything and create the sample templates (one time):**
   ```bash
   npm run setup
   ```
   This installs the server and client packages and creates two sample PDF templates from XYZ COLLEGE.
3. **Start the app:**
   ```bash
   npm run dev
   ```
   You should see:
   ```
   API listening on http://localhost:4000
   Logins: kshitij / pass123  or  alice / pass123
   Local:   http://localhost:5173/
   ```
4. **Open http://localhost:5173** in your browser.
5. **Sign in:** username `kshitij`, password `pass123`.
6. To stop the app, press `Ctrl+C` in the terminal.

Next time you only need `npm run dev`.

### Try it

1. On the library page click **Start filling** on *Practical Record (fillable form)*.
2. Type in the text boxes, choose a department, pick a semester, tick the checklist boxes.
3. Click **Pen** and draw in the observation box. Use **Eraser** or **Undo stroke** to fix mistakes.
4. Click **Save draft** (or press Ctrl+S). The page header shows the new version number.
5. Click **Back**, then **Open / edit**: everything you entered is restored.
6. Click **History** to open an older version, and **Download final PDF** to get the finished file.
7. Start *Lab Logbook (flat PDF, no fields)* and use **＋ Text box**, **＋ Checkbox**, **＋ Dropdown**,
   then click on the page to place fields on a PDF that has none.
8. Back on the library page you can also upload your own PDF (max 15 MB).

### Other commands

| Command | What it does |
|---|---|
| `npm run dev` | API (port 4000) and web app (port 5173) together |
| `npm run server` / `npm run client` | Same, but in two separate terminals |
| `npm test` | Runs the 13 API tests |
| `npm run build` then `npm start` | Production mode: one server on http://localhost:4000 serves the app and the API |

Optional environment variables for the server: `PORT` (default 4000), `DATA_DIR` (default `server/data`),
`JWT_SECRET` (default is for development only; set your own in production).
If you change `PORT`, also change the proxy address in `client/vite.config.js`.

### Reset the sample data

Delete the `server/data` folder, then run `npm --prefix server run seed`.
This removes all saved documents and uploaded templates.

### Troubleshooting

| Problem | Cause and fix |
|---|---|
| Login page says "Cannot reach the API server" | The API is not running. Use `npm run dev` (or `npm run server` in a second terminal) and read the terminal for errors |
| `Cannot find package 'express'` (or any package) | Old or partial `node_modules`. Run `rm -rf server/node_modules client/node_modules` then `npm run setup` |
| `Port 4000 is already in use` | Another program uses it. Close it, or see the `PORT` note above |
| "Invalid username or password" | Users are `kshitij` and `alice`, password `pass123` for both, all lowercase |
| Sample PDF still shows an old college name | Old data. Delete `server/data` and run the seed command above |
| Empty template list | Run `npm --prefix server run seed` |
| Strange errors on an old Node | Check `node -v`: it must be 22 or newer |
| Login worked before, now you are logged out | Tokens last 12 hours and are cleared when the tab closes. Sign in again |

---

## 2. What it can do

| Task requirement | How |
|---|---|
| Upload / select a college PDF | Two sample templates are included; users can also upload their own PDF |
| Text inputs, checkboxes, radio buttons, dropdowns | Fields inside a fillable PDF are found automatically and shown as normal HTML inputs |
| PDFs with no form fields | The "＋ Text box / Checkbox / Dropdown" buttons let the user place fields anywhere on the page |
| Freehand drawing | Pen (colour and width), eraser, undo. Works with mouse, touch and stylus |
| Save per user, reopen, edit | Every save is a new version. Opening a document restores all fields and drawings |
| Download | "Download final PDF" gives a flattened PDF |
| Simple auth | Login returns a token (JWT). Every document belongs to the user who made it |

## 3. How it works

The college PDF is never changed. What the student types and draws is saved as a small JSON file
called the **draft**. To show a document we load the original PDF and put the draft on top of it.
To download, the server writes the draft into a copy of the PDF.

```
draft = {
  fields:  { student_name: "Kshitij", semester: "3", ... },   values of the PDF's own form fields
  custom:  [ { page, type, x, y, w, h, value }, ... ],      fields the user added
  strokes: [ { page, color, width, points }, ... ]          pen drawings
}
```

Positions are stored in PDF points from the top-left of the page, so they stay correct at any zoom level.

### A page on screen has three layers

1. a `<canvas>` with the page, drawn by pdf.js
2. HTML inputs on top of it: one for each field of the PDF, plus the fields the user added
3. a transparent SVG on top, for pen strokes

### Saving and versions

Files on disk:

```
server/data/
  shared-templates/<id>.pdf + <id>.json          templates from the college
  users/<userId>/templates/                      templates the user uploaded
  users/<userId>/documents/<docId>/
      meta.json                                  title, template, latest version number
      versions/v1.json, v2.json, ...             one file per save
```

- Saving never overwrites. It writes a new `vN.json`, so the full history is kept.
- The browser says which version it started from. If another tab saved in between, the server answers
  "409 conflict" instead of overwriting.
- To restore an old version: open it and save. That creates a new latest version.
- Reopening a draft works because we store the data, not a finished PDF.

### Final PDF (flattened)

`GET /api/documents/:id/export` loads the template, fills the form fields, draws the user's added fields
and pen strokes, then flattens the form. Flattening turns the fields into normal page content, so the
file can't be edited anymore and looks the same in every viewer.

### Security basics

- **Upload checks** (`server/src/pdf/validatePdf.js`): max 15 MB, must really be a PDF (not just the file name),
  must open without errors, no password, max 200 pages, no JavaScript / launch actions / attachments.
  Files are saved under random ids, never under the name the user gave.
- **Access control:** all routes except login need a token. Documents are always looked up inside the logged-in
  user's own folder, so another user's id returns 404. Ids are checked before they are used in a file path.
- **Input checks:** the draft is cleaned and size-limited (`documentState.js`) before saving.
- **Other:** `helmet` headers and a limit on login attempts.
- **To replace in a real product:** the hard-coded users and secret (use college SSO), keep the token in an
  httpOnly cookie, add a virus scan on upload, use HTTPS.

## 4. Project layout

```
server/
  src/
    server.js            starts the server
    app.js               sets up Express and connects the routes
    config.js            settings and the demo users
    modules/
      auth/              login
      templates/         list, upload, download, delete templates
      documents/         create, save versions, export (+ documentState.js cleans the draft)
    pdf/
      validatePdf.js     checks an uploaded PDF
      exportPdf.js       template + draft -> final PDF
    middleware/          token check, error handler, file upload
    lib/                 small helpers (paths, ids, writing files, errors)
  scripts/seed.js        creates the sample templates
  test/api.test.js       API tests
client/src/
  main.jsx, App.jsx      start-up and simple page switching
  api/                   all calls to the backend
  pages/                 LoginPage, LibraryPage, EditorPage
  features/editor/
    useEditorDocument.js load, save, versions, download
    useDraft.js          the draft state and the actions that change it
    PdfPage.jsx          one page (the three layers)
    FormWidget.jsx       one PDF form field as an HTML input
    CustomField.jsx      a field the user added (move, resize, delete)
    InkLayer.jsx         pen, eraser, click-to-place
    EditorToolbar.jsx, VersionHistory.jsx, pdfjs.js
  styles/                base.css, library.css, editor.css
```

Good order for reading the code: `EditorPage.jsx` -> `useEditorDocument.js` -> `PdfPage.jsx` on the client,
and `app.js` -> `documents.routes.js` -> `documents.store.js` -> `exportPdf.js` on the server.

## 5. API

| Request | What it does |
|---|---|
| `POST /api/auth/login` | `{ username, password }` returns `{ token, user }` |
| `GET /api/templates` | list templates |
| `POST /api/templates` | upload a PDF (form field `file`) |
| `GET /api/templates/:scope/:id/file` | the template PDF (`scope` is `shared` or `mine`) |
| `DELETE /api/templates/:id` | remove one of my templates |
| `GET /api/documents` / `POST /api/documents` | list my documents / start a new one |
| `GET /api/documents/:id?version=N` | open a document (latest version unless `version` is given) |
| `PUT /api/documents/:id` | save a draft as a new version: `{ state, baseVersion }` |
| `GET /api/documents/:id/versions` | version history |
| `GET /api/documents/:id/export?version=N` | download the flattened PDF |
| `DELETE /api/documents/:id` | delete a document and its versions |

## 6. Why these choices

| Choice | Why | Downside |
|---|---|---|
| pdf.js + HTML inputs + pdf-lib (used here) | Free, full control, works for fillable and flat PDFs, drafts stay small JSON | We own the overlay code |
| Commercial PDF SDK (Apryse, Nutrient) | Most complete (signatures, rotation) | Licence cost, vendor lock-in |
| Writing values into the PDF on every save | One file only | Hard to reopen as a draft, no clean versions |
| Local files for storage | Zero setup, easy to inspect | Not for several servers. Production: PostgreSQL for data + S3 / Azure Blob for PDFs, same API |

## 7. Limits of this prototype

- Rotated pages are not handled.
- Signature fields are not supported.
- The final PDF uses a standard font, so non-Latin text (e.g. Devanagari) turns into `?`. Fix: embed a Unicode font with `@pdf-lib/fontkit`.
- The eraser removes a whole stroke at a time.
- No autosave: the user presses **Save draft** (or Ctrl+S).

## 8. What I would build next

1. Let staff define the fields of a flat PDF once, so students don't have to place them.
2. Autosave and offline support.
3. A database plus S3 / Azure Blob instead of local files.
4. A .NET version of the API if that is the team's main stack. The endpoints above stay the same.
5. Signature field, faculty review / sign-off, Unicode fonts, rotated pages.
6. Browser tests (Playwright) for the editor and a CI pipeline.
