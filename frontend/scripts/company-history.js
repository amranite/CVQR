document.addEventListener("DOMContentLoaded", async () => {
  if (!requireAuth(["company"])) return;
  const notice = $("#historyNotice");
  const list = $("#historyList");
  const empty = $("#historyEmpty");
  const count = $("#historyCount");

  try {
    const scans = await apiFetch("/company/scans");
    count.textContent = `${scans.length} CV${scans.length === 1 ? "" : "s"} collected`;
    list.innerHTML = "";

    if (!scans.length) {
      empty.classList.remove("hidden");
      return;
    }

    empty.classList.add("hidden");
    scans.forEach((scan) => {
      const link = document.createElement("a");
      link.className = "list-item";
      link.href = `company-cv.html?cv_id=${encodeURIComponent(scan.cv_id)}`;
      link.innerHTML = `
        <div class="list-item-left">
          <span class="list-item-name">${scan.student_name}</span>
          <span class="list-item-sub">${relativeScanLabel(scan.scanned_at)}</span>
        </div>
        <span class="badge badge-blue">View</span>
      `;
      list.appendChild(link);
    });
  } catch (error) {
    showNotice(notice, error.message, "error");
  }
});
