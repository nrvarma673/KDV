/* ==========================================================================
   auth.js — shared authentication helpers
   Loaded (after firebase-config.js) on every page.
   ========================================================================== */

/**
 * Checks whether the given user is an admin (listed in the "admins"
 * Firestore collection, doc id = their uid). Admin-only writes are
 * ultimately enforced by the security rules, not this check — this is
 * just so the UI can show the right thing. Returns a Promise<boolean>.
 */
function checkIsAdmin(user) {
  if (!user) return Promise.resolve(false);
  return db.collection("admins").doc(user.uid).get()
    .then((doc) => doc.exists)
    .catch(() => false); // permission-denied (not listed) => not an admin
}

/**
 * Updates the header nav area depending on whether someone is logged in,
 * and whether they're an admin (only admins see the "Admin" link).
 * Call this once per page after DOM is ready.
 */
function initAuthNav() {
  const area = document.getElementById("nav-auth-area");
  if (!area) return;

  auth.onAuthStateChanged((user) => {
    if (user) {
      checkIsAdmin(user).then((isAdmin) => {
        area.innerHTML = `
          <a href="account.html" class="btn btn-outline btn-sm">My Account</a>
          ${isAdmin ? '<a href="admin.html" class="btn btn-outline btn-sm">Admin</a>' : ""}
          <button id="logout-btn" class="btn btn-primary btn-sm">Log out</button>
        `;
        document.getElementById("logout-btn").addEventListener("click", () => {
          auth.signOut().then(() => window.location.href = "index.html");
        });
      });
    } else {
      area.innerHTML = `<a href="login.html" class="btn btn-primary btn-sm">Family Login</a>`;
    }
  });
}

/**
 * Guards a page so it only renders for logged-in users.
 * onReady(user) fires once auth state is known and user is signed in.
 * If not signed in, redirects to login.html.
 */
function requireAuth(onReady) {
  auth.onAuthStateChanged((user) => {
    if (user) {
      onReady(user);
    } else {
      window.location.href = "login.html";
    }
  });
}

/**
 * Guards admin.html specifically: requires login AND admin status.
 * onReady(user) fires only for a logged-in admin. Non-admins (logged in
 * but not listed in "admins") see a friendly access-denied message
 * instead of forms that would just fail against the security rules.
 */
function requireAdmin(onReady) {
  requireAuth((user) => {
    checkIsAdmin(user).then((isAdmin) => {
      if (isAdmin) {
        onReady(user);
      } else {
        const main = document.getElementById("admin-main");
        const gate = document.getElementById("password-gate");
        if (gate) gate.style.display = "none";
        if (main) {
          main.style.display = "block";
          main.innerHTML = `
            <div class="locked-panel">
              <div class="lock-icon">🚫</div>
              <h2>No admin access</h2>
              <p>You're logged in as <strong>${user.email}</strong>, but this account
                 doesn't have admin/upload rights on this site — only viewing.</p>
              <a href="timeline.html" class="btn btn-primary">Go to Timeline</a>
            </div>
          `;
        }
      }
    });
  });
}

/**
 * Reads the site-wide "must change password" flag from Firestore.
 * Returns a Promise<boolean>.
 */
function mustChangePassword() {
  return db.collection("settings").doc("security").get().then((doc) => {
    if (!doc.exists) return false;
    return !!doc.data().mustChangePassword;
  });
}

function clearMustChangePasswordFlag() {
  return db.collection("settings").doc("security").set(
    { mustChangePassword: false },
    { merge: true }
  );
}
