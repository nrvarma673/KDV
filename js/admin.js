/* ==========================================================================
   admin.js — logic for admin.html
   Handles: forced first-login password change, seeding default data,
   managing timeline years, uploading photos, managing achievements.
   ========================================================================== */

function showMsg(el, text, type) {
  el.textContent = text;
  el.className = "form-msg " + type;
  el.style.display = "block";
}

/* ---------------- Forced password change ---------------- */

function initPasswordGate(user, onDone) {
  const gate = document.getElementById("password-gate");
  const main = document.getElementById("admin-main");

  mustChangePassword().then((needsChange) => {
    if (!needsChange) {
      gate.style.display = "none";
      main.style.display = "block";
      onDone();
      return;
    }
    gate.style.display = "block";
    main.style.display = "none";

    const form = document.getElementById("change-password-form");
    const msg = document.getElementById("change-password-msg");

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const pw1 = document.getElementById("new-password").value;
      const pw2 = document.getElementById("confirm-password").value;

      if (pw1.length < 8) {
        showMsg(msg, "Password must be at least 8 characters.", "error");
        return;
      }
      if (pw1 !== pw2) {
        showMsg(msg, "Passwords do not match.", "error");
        return;
      }

      user.updatePassword(pw1)
        .then(() => clearMustChangePasswordFlag())
        .then(() => {
          showMsg(msg, "Password updated. Loading admin panel…", "success");
          setTimeout(() => {
            gate.style.display = "none";
            main.style.display = "block";
            onDone();
          }, 900);
        })
        .catch((err) => {
          if (err.code === "auth/requires-recent-login") {
            showMsg(msg, "For security, please log out and log back in with your temporary password, then try again immediately.", "error");
          } else {
            showMsg(msg, "Could not update password: " + err.message, "error");
          }
        });
    });
  });
}

/* ---------------- Default data seeding ---------------- */

const DEFAULT_YEARS = [
  { id: "year-1", label: "Year 1", order: 1, caption: "The first year — add photos and a short caption here." },
  { id: "year-2", label: "Year 2", order: 2, caption: "" },
  { id: "year-3", label: "Year 3", order: 3, caption: "" },
  { id: "year-4", label: "Year 4", order: 4, caption: "" },
  { id: "year-5", label: "Year 5", order: 5, caption: "" },
  { id: "year-6", label: "Year 6", order: 6, caption: "" },
];

function initSeedButton() {
  const btn = document.getElementById("seed-years-btn");
  const msg = document.getElementById("seed-msg");
  btn.addEventListener("click", () => {
    btn.disabled = true;
    const batch = db.batch();
    DEFAULT_YEARS.forEach((y) => {
      const ref = db.collection("years").doc(y.id);
      batch.set(ref, { label: y.label, order: y.order, caption: y.caption }, { merge: true });
    });
    batch.commit()
      .then(() => {
        showMsg(msg, "Default Year 1–6 sections are ready. Rename, add, or remove years below.", "success");
        loadYears();
      })
      .catch((err) => showMsg(msg, "Error: " + err.message, "error"))
      .finally(() => { btn.disabled = false; });
  });

  const achBtn = document.getElementById("seed-achievement-btn");
  achBtn.addEventListener("click", () => {
    achBtn.disabled = true;
    db.collection("achievements").add({
      certifyingBody: "Asia Book of Records",
      title: "Grand Master — Fastest reading of 100 English words",
      date: "18 September 2023",
      age: "3 years 8 months",
      description: "Read 100 English words (4–10 letters each) in 1 minute 49.68 seconds, earning the 'Grand Master' title.",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    }).then(() => {
      showMsg(document.getElementById("seed-msg"), "Example achievement added — edit or delete it below, and add more.", "success");
      loadAchievements();
    }).catch((err) => showMsg(document.getElementById("seed-msg"), "Error: " + err.message, "error"))
      .finally(() => { achBtn.disabled = false; });
  });
}

/* ---------------- Manage years ---------------- */

function loadYears() {
  const listEl = document.getElementById("years-list");
  const selectEl = document.getElementById("upload-year-select");
  listEl.innerHTML = "Loading…";

  db.collection("years").orderBy("order", "asc").get().then((snap) => {
    listEl.innerHTML = "";
    selectEl.innerHTML = "";
    if (snap.empty) {
      listEl.innerHTML = `<p class="empty-state">No years yet. Use "Set up default Year 1–6" above, or add one manually.</p>`;
      return;
    }
    snap.forEach((doc) => {
      const y = doc.data();
      const row = document.createElement("div");
      row.className = "year-manage-row";
      row.innerHTML = `
        <span><strong>${escapeHtml(y.label)}</strong> ${y.caption ? "— " + escapeHtml(y.caption) : ""}</span>
        <button class="btn btn-danger btn-sm" data-id="${doc.id}">Delete</button>
      `;
      row.querySelector("button").addEventListener("click", () => deleteYear(doc.id));
      listEl.appendChild(row);

      const opt = document.createElement("option");
      opt.value = doc.id;
      opt.textContent = y.label;
      selectEl.appendChild(opt);
    });
  });
}

function deleteYear(yearId) {
  if (!confirm("Delete this year and all its photos? This cannot be undone.")) return;
  db.collection("years").doc(yearId).collection("photos").get().then((photosSnap) => {
    const batch = db.batch();
    photosSnap.forEach((p) => batch.delete(p.ref));
    batch.delete(db.collection("years").doc(yearId));
    return batch.commit();
  }).then(loadYears);
}

function initAddYearForm() {
  const form = document.getElementById("add-year-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const label = document.getElementById("new-year-label").value.trim();
    const order = parseInt(document.getElementById("new-year-order").value, 10) || 99;
    const caption = document.getElementById("new-year-caption").value.trim();
    if (!label) return;

    const id = "year-" + Date.now();
    db.collection("years").doc(id).set({ label, order, caption }).then(() => {
      form.reset();
      loadYears();
    });
  });
}

/* ---------------- Upload photo ---------------- */

function initUploadForm() {
  const form = document.getElementById("upload-photo-form");
  const msg = document.getElementById("upload-msg");
  const progressOuter = document.getElementById("upload-progress-outer");
  const progressInner = document.getElementById("upload-progress-inner");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const yearId = document.getElementById("upload-year-select").value;
    const file = document.getElementById("upload-file-input").files[0];
    const caption = document.getElementById("upload-caption").value.trim();

    if (!yearId) { showMsg(msg, "Please add a year first.", "error"); return; }
    if (!file) { showMsg(msg, "Please choose a photo file.", "error"); return; }
    if (!file.type.startsWith("image/")) { showMsg(msg, "Please choose an image file.", "error"); return; }

    const path = `photos/${yearId}/${Date.now()}-${file.name}`;
    const ref = storage.ref().child(path);
    const task = ref.put(file);

    progressOuter.style.display = "block";
    task.on("state_changed",
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        progressInner.style.width = pct + "%";
      },
      (err) => {
        showMsg(msg, "Upload failed: " + err.message, "error");
        progressOuter.style.display = "none";
      },
      () => {
        task.snapshot.ref.getDownloadURL().then((url) => {
          return db.collection("years").doc(yearId).collection("photos").add({
            url,
            path,
            caption,
            uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
        }).then(() => {
          showMsg(msg, "Photo uploaded successfully.", "success");
          form.reset();
          progressOuter.style.display = "none";
          progressInner.style.width = "0%";
        });
      }
    );
  });
}

/* ---------------- Manage achievements ---------------- */

function loadAchievements() {
  const listEl = document.getElementById("achievements-manage-list");
  listEl.innerHTML = "Loading…";
  db.collection("achievements").orderBy("date", "desc").get().then((snap) => {
    listEl.innerHTML = "";
    if (snap.empty) {
      listEl.innerHTML = `<p class="empty-state">No achievements added yet.</p>`;
      return;
    }
    snap.forEach((doc) => {
      const a = doc.data();
      const row = document.createElement("div");
      row.className = "year-manage-row";
      row.innerHTML = `
        <span><strong>${escapeHtml(a.title)}</strong> — ${escapeHtml(a.certifyingBody)} (${escapeHtml(a.date || "")})</span>
        <button class="btn btn-danger btn-sm" data-id="${doc.id}">Delete</button>
      `;
      row.querySelector("button").addEventListener("click", () => {
        if (confirm("Delete this achievement?")) {
          db.collection("achievements").doc(doc.id).delete().then(loadAchievements);
        }
      });
      listEl.appendChild(row);
    });
  });
}

function initAddAchievementForm() {
  const form = document.getElementById("add-achievement-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const certifyingBody = document.getElementById("ach-body").value.trim();
    const title = document.getElementById("ach-title").value.trim();
    const date = document.getElementById("ach-date").value.trim();
    const age = document.getElementById("ach-age").value.trim();
    const description = document.getElementById("ach-description").value.trim();
    if (!title || !certifyingBody) return;

    db.collection("achievements").add({
      certifyingBody, title, date, age, description,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    }).then(() => {
      form.reset();
      loadAchievements();
    });
  });
}

/* ---------------- Boot ---------------- */

document.addEventListener("DOMContentLoaded", () => {
  initAuthNav();
  requireAuth((user) => {
    document.getElementById("admin-email").textContent = user.email;
    initPasswordGate(user, () => {
      initSeedButton();
      initAddYearForm();
      initUploadForm();
      initAddAchievementForm();
      loadYears();
      loadAchievements();
    });
  });
});
