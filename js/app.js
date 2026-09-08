/* ==========================================================================
   app.js — logic for index.html (home page)
   ========================================================================== */

function renderAchievements() {
  const list = document.getElementById("achievements-list");
  if (!list) return;

  db.collection("achievements")
    .orderBy("date", "desc")
    .get()
    .then((snapshot) => {
      if (snapshot.empty) {
        list.innerHTML = `<p class="empty-state">Achievement details will appear here once added from the Admin panel.</p>`;
        return;
      }
      list.innerHTML = "";
      snapshot.forEach((doc) => {
        const a = doc.data();
        const card = document.createElement("div");
        card.className = "card achievement-card";
        card.innerHTML = `
          <span class="body-badge">${escapeHtml(a.certifyingBody || "Record")}</span>
          <h3>${escapeHtml(a.title || "")}</h3>
          <p class="meta">${escapeHtml(a.date || "")}${a.age ? " · Age: " + escapeHtml(a.age) : ""}</p>
          <p>${escapeHtml(a.description || "")}</p>
        `;
        list.appendChild(card);
      });
    })
    .catch((err) => {
      console.error(err);
      list.innerHTML = `<p class="empty-state">Achievements could not be loaded right now.</p>`;
    });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", () => {
  initAuthNav();
  renderAchievements();
  const yearEl = document.getElementById("footer-year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});
