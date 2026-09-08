/* ==========================================================================
   admin.js — logic for admin.html
   Handles: forced first-login password change, seeding default data,
   managing timeline years, uploading photos, managing achievements.
   ========================================================================== */

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

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

/* ---------------- Change password (always available) ---------------- */

function initAdminChangePasswordForm(user) {
  const form = document.getElementById("admin-change-password-form");
  const msg = document.getElementById("admin-change-password-msg");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const pw1 = document.getElementById("admin-new-password").value;
    const pw2 = document.getElementById("admin-confirm-password").value;

    if (pw1.length < 8) {
      showMsg(msg, "Password must be at least 8 characters.", "error");
      return;
    }
    if (pw1 !== pw2) {
      showMsg(msg, "Passwords do not match.", "error");
      return;
    }

    user.updatePassword(pw1)
      .then(() => {
        showMsg(msg, "Password updated successfully.", "success");
        form.reset();
      })
      .catch((err) => {
        if (err.code === "auth/requires-recent-login") {
          showMsg(msg, "For security, please log out and log back in, then try again immediately.", "error");
        } else {
          showMsg(msg, "Could not update password: " + err.message, "error");
        }
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
  }).then(() => {
    loadYears();
    loadManagePhotos();
  });
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
    const fit = document.getElementById("upload-fit").value;

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
            fit,
            uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
        }).then(() => {
          showMsg(msg, "Photo uploaded successfully.", "success");
          form.reset();
          progressOuter.style.display = "none";
          progressInner.style.width = "0%";
          loadManagePhotos();
        });
      }
    );
  });
}

/* ---------------- Manage photos (edit caption/frame, delete) ---------------- */

function loadManagePhotos() {
  const container = document.getElementById("manage-photos-list");
  container.innerHTML = `<p class="empty-state">Loading…</p>`;

  db.collection("years").orderBy("order", "asc").get().then((yearsSnap) => {
    if (yearsSnap.empty) {
      container.innerHTML = `<p class="empty-state">No years yet — add one above first.</p>`;
      return;
    }
    container.innerHTML = "";

    const groupPromises = [];
    yearsSnap.forEach((yearDoc) => {
      const year = yearDoc.data();
      const yearId = yearDoc.id;

      const p = db.collection("years").doc(yearId).collection("photos")
        .orderBy("uploadedAt", "desc").get()
        .then((photosSnap) => {
          if (photosSnap.empty) return null;

          const group = document.createElement("div");
          group.className = "photo-manage-group";
          group.innerHTML = `<h4>${escapeHtml(year.label)}</h4>`;

          photosSnap.forEach((photoDoc) => {
            const photo = photoDoc.data();
            const row = document.createElement("div");
            row.className = "photo-manage-row";
            row.innerHTML = `
              <div class="photo-manage-thumb"><img src="${photo.url}" alt=""></div>
              <div class="photo-manage-fields">
                <input type="text" class="pm-caption" value="${escapeHtml(photo.caption || "")}" placeholder="Caption">
                <select class="pm-fit">
                  <option value="cover" ${(!photo.fit || photo.fit === "cover") ? "selected" : ""}>Fill frame</option>
                  <option value="contain" ${photo.fit === "contain" ? "selected" : ""}>Show full photo</option>
                </select>
                <button type="button" class="btn btn-outline btn-sm pm-save">Save</button>
                <button type="button" class="btn btn-danger btn-sm pm-delete">Delete</button>
              </div>
            `;

            row.querySelector(".pm-save").addEventListener("click", () => {
              const newCaption = row.querySelector(".pm-caption").value.trim();
              const newFit = row.querySelector(".pm-fit").value;
              db.collection("years").doc(yearId).collection("photos").doc(photoDoc.id)
                .update({ caption: newCaption, fit: newFit })
                .then(() => {
                  const btn = row.querySelector(".pm-save");
                  const original = btn.textContent;
                  btn.textContent = "Saved ✓";
                  setTimeout(() => { btn.textContent = original; }, 1500);
                });
            });

            row.querySelector(".pm-delete").addEventListener("click", () => {
              if (!confirm("Delete this photo permanently?")) return;
              const deletions = [
                db.collection("years").doc(yearId).collection("photos").doc(photoDoc.id).delete(),
              ];
              if (photo.path) {
                deletions.push(storage.ref().child(photo.path).delete().catch(() => {}));
              }
              Promise.all(deletions).then(() => {
                row.remove();
              });
            });

            group.appendChild(row);
          });

          return group;
        });
      groupPromises.push(p);
    });

    Promise.all(groupPromises).then((groups) => {
      const realGroups = groups.filter(Boolean);
      if (realGroups.length === 0) {
        container.innerHTML = `<p class="empty-state">No photos uploaded yet.</p>`;
        return;
      }
      realGroups.forEach((g) => container.appendChild(g));
    });
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

/* ---------------- Manage Users ---------------- */

/**
 * Creates a brand-new Firebase Auth user WITHOUT signing out the currently
 * logged-in admin. Firebase's default createUserWithEmailAndPassword()
 * would normally sign the new user in on the same app instance (kicking
 * the admin out) — so we spin up a throwaway "secondary" Firebase app
 * just for this one call, then tear it down immediately.
 */
function createUserWithoutSigningOut(email, password) {
  const secondaryApp = firebase.initializeApp(firebaseConfig, "Secondary-" + Date.now());
  const secondaryAuth = secondaryApp.auth();
  return secondaryAuth.createUserWithEmailAndPassword(email, password)
    .then((cred) => {
      const uid = cred.user.uid;
      return secondaryAuth.signOut()
        .then(() => secondaryApp.delete())
        .then(() => uid);
    })
    .catch((err) => {
      // Still clean up the secondary app on failure.
      return secondaryApp.delete().finally(() => { throw err; });
    });
}

function initAddUserForm() {
  const form = document.getElementById("add-user-form");
  const msg = document.getElementById("add-user-msg");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("new-user-email").value.trim();
    const password = document.getElementById("new-user-password").value;
    const grantAdmin = document.getElementById("new-user-is-admin").checked;

    if (password.length < 8) {
      showMsg(msg, "Temporary password must be at least 8 characters.", "error");
      return;
    }

    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;

    createUserWithoutSigningOut(email, password)
      .then((uid) => {
        if (grantAdmin) {
          return db.collection("admins").doc(uid).set({ email }).then(() => uid);
        }
        return uid;
      })
      .then(() => {
        showMsg(msg,
          `User created: ${email}. Give them this email and temporary password — ` +
          `tell them to log in, then click "My Account" to set their own password.`,
          "success");
        form.reset();
        loadAdminsList();
      })
      .catch((err) => {
        showMsg(msg, "Could not create user: " + err.message, "error");
      })
      .finally(() => { submitBtn.disabled = false; });
  });
}

function loadAdminsList() {
  const listEl = document.getElementById("admins-list");
  listEl.innerHTML = `<p class="empty-state">Loading…</p>`;

  db.collection("admins").get().then((snap) => {
    listEl.innerHTML = "";
    if (snap.empty) {
      listEl.innerHTML = `<p class="empty-state">No admins listed (unexpected — you're logged in as one).</p>`;
      return;
    }
    const currentUid = auth.currentUser.uid;
    snap.forEach((doc) => {
      const data = doc.data();
      const isSelf = doc.id === currentUid;
      const row = document.createElement("div");
      row.className = "year-manage-row";
      row.innerHTML = `
        <span>${escapeHtml(data.email || "(no email on file)")} ${isSelf ? "<em>(you)</em>" : ""}
          <br><span class="hint" style="font-size:.75rem;">${doc.id}</span>
        </span>
        <button class="btn btn-danger btn-sm">Remove admin access</button>
      `;
      row.querySelector("button").addEventListener("click", () => {
        const warning = isSelf
          ? "This will remove YOUR OWN admin access immediately, logging you out of admin features. Continue?"
          : `Remove admin access for ${data.email || doc.id}? They'll keep their login but become a viewer.`;
        if (!confirm(warning)) return;
        db.collection("admins").doc(doc.id).delete().then(() => {
          if (isSelf) {
            window.location.href = "timeline.html";
          } else {
            loadAdminsList();
          }
        });
      });
      listEl.appendChild(row);
    });
  }).catch((err) => {
    listEl.innerHTML = `<p class="empty-state">Could not load admins: ${escapeHtml(err.message)}</p>`;
  });
}

function initPromoteUserForm() {
  const form = document.getElementById("promote-user-form");
  const msg = document.getElementById("promote-msg");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const uid = document.getElementById("promote-uid").value.trim();
    const email = document.getElementById("promote-email").value.trim();
    if (!uid) return;

    db.collection("admins").doc(uid).set({ email: email || null }, { merge: true })
      .then(() => {
        showMsg(msg, "Admin access granted for that UID.", "success");
        form.reset();
        loadAdminsList();
      })
      .catch((err) => showMsg(msg, "Could not grant access: " + err.message, "error"));
  });
}

/* ---------------- Boot ---------------- */

document.addEventListener("DOMContentLoaded", () => {
  initAuthNav();
  requireAdmin((user) => {
    document.getElementById("admin-email").textContent = user.email;
    initAdminChangePasswordForm(user);
    initPasswordGate(user, () => {
      initSeedButton();
      initAddYearForm();
      initUploadForm();
      initAddAchievementForm();
      initAddUserForm();
      initPromoteUserForm();
      loadYears();
      loadAchievements();
      loadManagePhotos();
      loadAdminsList();
    });
  });
});
