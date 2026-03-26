document.addEventListener("DOMContentLoaded", async () => {
  if (!requireAuth(["admin"])) return;
  const notice = $("#adminNotice");
  const list = $("#adminList");
  const empty = $("#adminEmpty");
  const count = $("#adminCount");

  async function loadAdminList() {
    try {
      const cvs = await apiFetch("/admin/cvs");
      count.textContent = `${cvs.length} CV${cvs.length === 1 ? "" : "s"} uploaded`;
      list.innerHTML = "";

      if (!cvs.length) {
        empty.classList.remove("hidden");
        return;
      }

      empty.classList.add("hidden");
      cvs.forEach((cv) => {
        const row = document.createElement("div");
        row.className = "list-item";
        row.innerHTML = `
          <div class="list-item-left">
            <span class="list-item-name">${cv.name}</span>
            <span class="list-item-sub">${cv.email} · ${formatDate(cv.uploaded_at)}</span>
          </div>
          <button class="badge badge-red" data-user-id="${cv.student_id}" style="border:none; cursor:pointer;">Delete</button>
        `;
        list.appendChild(row);
      });

      list.querySelectorAll("button[data-user-id]").forEach((button) => {
        button.addEventListener("click", async () => {
          const userId = button.dataset.userId;
          const confirmed = window.confirm("Delete this student's CV?");
          if (!confirmed) return;
          try {
            const result = await apiFetch(`/admin/cv/${userId}`, { method: "DELETE" });
            showNotice(notice, result.message || "CV deleted.", "success");
            await loadAdminList();
          } catch (error) {
            showNotice(notice, error.message, "error");
          }
        });
      });
    } catch (error) {
      showNotice(notice, error.message, "error");
    }
  }

  await loadAdminList();
});
