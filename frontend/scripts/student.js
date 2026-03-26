document.addEventListener("DOMContentLoaded", async () => {
  if (!requireAuth(["student"])) return;

  const notice = $("#studentNotice");
  const emptyState = $("#emptyState");
  const cvState = $("#cvState");
  const uploadInput = $("#uploadInput");
  const replaceInput = $("#replaceInput");
  const deleteButton = $("#deleteCvButton");

  async function loadStudentCv() {
    hideNotice(notice);
    try {
      const cv = await apiFetch("/cv/me");
      emptyState.classList.add("hidden");
      cvState.classList.remove("hidden");
      $("#cvFileName").textContent = cv.original_name;
      $("#cvUploadedAt").textContent = formatDate(cv.updated_at || cv.uploaded_at);
      $("#cvExpiresAt").textContent = formatDate(cv.expires_at, true);
      $("#qrImage").src = `${API_BASE_URL}/qr/me?ts=${Date.now()}`;
      try {
        const qr = await apiFetch("/qr/me");
        $("#qrImage").src = qr.qrImage;
      } catch {
        // fallback left in place if /qr/me request fails unexpectedly
      }
      $("#openCvLink").href = `${API_BASE_URL}/uploads/${cv.file_path}`;
    } catch (error) {
      if (error.status === 404) {
        cvState.classList.add("hidden");
        emptyState.classList.remove("hidden");
        return;
      }
      showNotice(notice, error.message, "error");
    }
  }

  async function uploadCv(file, method = "POST") {
    hideNotice(notice);
    if (!file) return;
    if (file.type !== "application/pdf") {
      showNotice(notice, "Only PDF files are allowed.", "error");
      return;
    }

    const formData = new FormData();
    formData.append("cv", file);

    try {
      const path = method === "POST" ? "/cv/upload" : "/cv";
      const result = await apiFetch(path, { method, body: formData });
      showNotice(notice, result.message || "CV saved.", "success");
      await loadStudentCv();
    } catch (error) {
      showNotice(notice, error.message, "error");
    }
  }

  uploadInput.addEventListener("change", () => uploadCv(uploadInput.files[0], "POST"));
  replaceInput.addEventListener("change", () => uploadCv(replaceInput.files[0], "PUT"));

  deleteButton.addEventListener("click", async () => {
    hideNotice(notice);
    const confirmed = window.confirm("Delete your current CV?");
    if (!confirmed) return;
    try {
      const result = await apiFetch("/cv", { method: "DELETE" });
      showNotice(notice, result.message || "CV deleted.", "success");
      await loadStudentCv();
    } catch (error) {
      showNotice(notice, error.message, "error");
    }
  });

  await loadStudentCv();
});
