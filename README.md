# KDV — Krishna's Life Journey

A private family website recording Krishna Deva Varma's childhood in a
year-by-year photo timeline, with a public home page highlighting his
record-holder achievements and a family-only login for viewing the full
album and uploading new photos.

---

## 1. How this is built, in plain terms

| Layer | Technology | Why |
|---|---|---|
| Pages you see (HTML/CSS/JS) | Plain static files | Free to host, no server to maintain |
| Hosting | **GitHub Pages** | Free, reliable, deploys automatically when you push to GitHub |
| Login | **Firebase Authentication** | A real, secure username/password login — not a fake gate |
| Photo storage | **Firebase Cloud Storage** | Uploaded photos are stored securely in the cloud, not in the GitHub repo |
| Timeline/achievement data | **Firebase Firestore** | A small free database holding year labels, captions, and achievement text |

**GitHub Pages itself cannot run a login screen or accept uploads** — it only
serves fixed files. Firebase supplies the missing piece (login + storage +
database) for free, without you needing a paid server.

### What is public vs. private

- **Public, no login needed:** the Home page — a short bio, the achievement
  list, and the YouTube video.
- **Private, login required:** the Timeline page (all of Krishna's actual
  photos) and the Admin panel (uploading photos, managing years and
  achievements).

This is enforced in two places, not just by hiding a link: the Firestore and
Storage **security rules** (`rules/firestore.rules`, `rules/storage.rules`)
reject any photo read/write from someone who isn't logged in, at the
database level — so even a technically savvy visitor cannot pull the photos
without valid credentials.

### About the GitHub repository being public

GitHub Pages **only publishes for free from a public repository** on a free
personal account (a private repo's Pages site is a paid Pro/Team feature).
Because of that:

- The repo (this source code) will be **public** — anyone can view the
  HTML/CSS/JS.
- That is fine here because **no photos and no personal data (including any
  birth date) are stored in this repository at all** — photos live in
  Firebase Storage, gated by login. The only thing in the public repo is
  generic website code plus a Firebase *connection* config, which Google's
  own documentation confirms is safe to expose publicly (real protection
  comes from the security rules, not from secrecy of that config).
- If you would still prefer the source code itself to be private, the
  alternative is: keep the GitHub repo private (for backup/version control)
  and deploy the *site* via **Netlify** or **Vercel** instead of GitHub
  Pages — both offer a free tier that can deploy straight from a private
  GitHub repo. Say the word and I'll adapt the deployment steps below for
  that instead.

### Cost

- GitHub Pages: free, unlimited for public repos.
- Firebase Authentication and Firestore (the database): free on the Spark
  plan, no card required. Free limits — 1 GiB Firestore storage, 50K
  reads/20K writes per day, unlimited email/password users. A family
  album stays well within this indefinitely.
- **Firebase Cloud Storage (photo files) — correction as of Sept 2024
  policy change:** Google now requires every project to be on the
  pay-as-you-go **Blaze** plan before it will create a Storage bucket at
  all, even if actual usage is $0. A card must be on file.
  - If the bucket region is one of `us-central1`/`us-west1`/`us-east1`,
    usage under 5 GB stored and 100 GB/month viewed stays inside Google's
    "Always Free" tier — genuinely $0/month.
  - **We chose `asia-south1` (Mumbai)** for faster photo loading in
    India. That region is *not* covered by Always Free, so real
    pay-as-you-go rates apply: roughly $0.02/GB stored per month and
    about $0.12/GB whenever a photo is viewed/downloaded. For a small
    family album this realistically comes to a few cents up to roughly
    $1/month — not "free," but not a meaningful cost either.
  - **Set a budget alert immediately after enabling Blaze** (Google Cloud
    Console → Billing → Budgets & alerts → Create budget → e.g. ₹100/
    $1 threshold) so you get an email the instant any charge would occur.
    Full steps are in Step 3 below.

---

## 2. One-time setup

### Step 1 — Create the Firebase project

1. Go to <https://console.firebase.google.com> and sign in with
   **nrvarma.673@gmail.com**.
2. Click **Add project**. Name it e.g. `kdv-life-journey`. Disable Google
   Analytics for this project (not needed) and click **Create project**.

### Step 2 — Enable Authentication and create the admin user

1. In the left sidebar, click **Authentication** (under Project shortcuts,
   or inside the "Security" category if shortcuts aren't shown), then
   **Get started**.
2. Under **Sign-in method**, enable **Email/Password**.
3. Go to the **Users** tab > **Add user**.
4. Email: `nrvarma.673@gmail.com`
   Password: use the temporary password from `ADMIN_CREDENTIALS_DO_NOT_COMMIT.txt`
   (generated for you, in this project folder — **do not commit that file to
   GitHub**; it's already excluded via `.gitignore`).
5. Click **Add user**.

You'll change this temporary password yourself the first time you log in —
the Admin panel forces this before letting you do anything else.

### Step 3 — Enable Firestore and Storage

1. **Firestore > Create database.** Choose **Production mode** and region
   `asia-south1` (Mumbai). Click **Enable**. (This stays on the free Spark
   plan — no billing needed.)
2. **Storage > Get started.** Firebase will prompt you to upgrade to the
   **Blaze (pay-as-you-go)** plan — this is now required by Google for any
   project to create a Storage bucket, even one that ends up costing $0.
   Click through the upgrade: you'll add a payment method and can set a
   billing budget on the same screen (do this — it's your safety net, see
   below). Once upgraded, create the bucket with region `asia-south1`, same
   as Firestore, and click **Done**.
3. **Set a budget alert right away** (Google Cloud Console →
   <https://console.cloud.google.com/billing> → select this project's
   billing account → **Budgets & alerts** → **Create budget**). Set a small
   threshold, e.g. ₹100, with email alerts at 50/90/100%. Because
   `asia-south1` isn't covered by Google's free-tier regions, real
   pay-as-you-go rates apply here — realistically a few cents to about
   $1/month for a small family album — and this alert guarantees you'll be
   emailed well before that ever becomes noticeable.

### Step 4 — Publish the security rules

1. **Firestore Database > Rules** tab. Delete the default contents and paste
   in the entire contents of `rules/firestore.rules` from this project.
   Click **Publish**.
2. **Storage > Rules** tab. Delete the default contents and paste in the
   entire contents of `rules/storage.rules` from this project. Click
   **Publish**.

### Step 5 — Register a Web App and get your config

1. In **Project settings** (gear icon, top left) > scroll to **Your apps** >
   click the **`</>`** (Web) icon.
2. Nickname it `kdv-web`, do **not** tick "Also set up Firebase Hosting"
   (we're using GitHub Pages instead), click **Register app**.
3. Firebase shows a `firebaseConfig` object. Copy each value into
   `js/firebase-config.js` in this project, replacing the
   `REPLACE_WITH_YOUR_...` placeholders. Save the file.

### Step 6 — Push this project to GitHub

You said you already have a GitHub account and want the repository named
**`KDV`**.

```bash
cd KDV
git init
git add .
git commit -m "Initial commit: KDV Life Journey website"
git branch -M main
git remote add origin https://github.com/<your-username>/KDV.git
git push -u origin main
```

(Replace `<your-username>` with your actual GitHub username. Create the
empty `KDV` repository on GitHub first via **New repository** — do not
initialise it with a README there, to avoid a merge conflict.)

**Repository visibility:** create it as **Public** (required for free
GitHub Pages hosting — see the note in section 1 above on why this is safe
here, and the private-repo alternative if you'd rather avoid it).

Double-check before your first commit that `js/firebase-config.js` has your
real values (fine to commit — see note above) and that
`ADMIN_CREDENTIALS_DO_NOT_COMMIT.txt` is **not** staged (`git status` should
not list it; `.gitignore` already excludes it).

### Step 7 — Turn on GitHub Pages

1. On GitHub, open the `KDV` repository > **Settings > Pages**.
2. Under **Build and deployment > Source**, choose **Deploy from a branch**.
3. Branch: `main`, folder: `/ (root)`. Click **Save**.
4. After a minute, GitHub shows your live URL, typically:
   `https://<your-username>.github.io/KDV/`

### Step 8 — First login and initial setup

1. Visit your live site, click **Family Login**, and sign in with
   `nrvarma.673@gmail.com` and the temporary password.
2. You'll immediately be asked to **set a new password** — do this now, then
   you're in the Admin panel.
3. Click **"Set up default Year 1–6 sections"** to create the initial
   timeline structure (you can rename, delete, or add more years afterwards
   — nothing here references or reveals an actual birth date).
4. Optionally click **"Add example achievement (Asia Book of Records)"** —
   this is the one record I could independently verify online (Grand
   Master title, reading 100 English words in 1 minute 49.68 seconds,
   confirmed 18 September 2023). Edit or delete it, and add the India Book
   of Records entry (and any others) with the **Manage Achievements** form
   once you have the exact certificate details — I did not want to guess
   or fabricate specifics for those.
5. Now go to **Upload a Photo**, pick a year, choose a file, add a caption,
   and upload. It will immediately appear on the Timeline page for anyone
   logged in.

---

## 3. Day-to-day use for the family

- **Adding photos:** log in → Admin → "Upload a Photo" → pick year, file,
  optional caption → Upload. No GitHub or coding needed for this.
- **Adding/renaming a year:** Admin → "Manage Timeline Years".
- **Adding an achievement:** Admin → "Manage Achievements" (shows on the
  public Home page).
- **Removing a photo:** currently done via the Firebase Console (Storage +
  Firestore) rather than the site UI — let me know if you'd like a
  "delete photo" button added to the Admin panel as a follow-up.
- **Forgot password:** the Login page has a "Forgot password?" link, which
  emails a reset link via Firebase to the admin email.

---

## 4. Privacy & confidentiality notes

- Krishna's **date of birth is never requested, stored, or displayed**
  anywhere on the site or in this repository, per your instruction.
- Timeline years are generic labels ("Year 1", "Year 2", …) that you can
  rename freely; they don't imply or reveal an exact age or birth year.
- All actual photographs are stored in Firebase Storage and are only
  readable by someone who has successfully logged in — they are never part
  of the public GitHub repository or the public Home page.
- The public GitHub repository contains only website code and a non-secret
  Firebase connection config — no photos, no personal identifiers.

---

## 5. What I could not verify and left open

- Your message mentioned the **India Book of Records**; independent web
  search only turned up a matching record under the **Asia Book of
  Records** (Grand Master title, 100-word reading feat, confirmed 18-Sep-2023).
  I have not fabricated an India Book of Records citation — please add the
  correct one(s) yourself via the Admin panel's achievement form once you
  have the certificate/citation details, and I'll be glad to help refine
  the wording.

---

## 6. Suggested next steps

- Send me the correct achievement/record details (any number of them) and
  I can help you phrase them for the Achievements section.
- If you'd rather the GitHub repository itself be private, tell me and I'll
  switch the deployment instructions to Netlify or Vercel (still free).
- Consider a short backup routine (e.g., periodically exporting the
  Firestore `achievements`/`years` data and downloading the Storage photos)
  since the free Firebase tier has no formal SLA — I can script this for
  you if useful.
