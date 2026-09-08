/* ==========================================================================
   auth.js — shared authentication helpers
   Loaded (after firebase-config.js) on every page.
   ========================================================================== */

/**
 * Updates the header nav area depending on whether someone is logged in.
 * Call this once per page after DOM is ready.
 */
function initAuthNav() {
  const area = document.getElementById("nav-auth-area");
  if (!area) return;

  auth.onAuthStateChanged((user) => {
    if (user) {
      area.innerHTML = `
        <a href="admin.html" class="btn btn-outline btn-sm">Admin</a>
        <button id="logout-btn" class="btn btn-primary btn-sm">Log out</button>
      `;
      document.getElementById("logout-btn").addEventListener("click", () => {
        auth.signOut().then(() => window.location.href = "index.html");
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
