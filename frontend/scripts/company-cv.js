document.addEventListener("DOMContentLoaded", async () => {
  if (!requireAuth(["company"])) return;
  const notice = $("#companyCvNotice");
  const params = new URLSearchParams(window.location.search);
  const cvId = params.get("cv_id");

  if (!cvId) {
    showNotice(notice, "No CV selected.", "error");
    return;
  }

  try {
    const scans = await apiFetch("/company/scans");
    const match = scans.find((entry) => String(entry.cv_id) === String(cvId));
    if (!match) throw new Error("This CV was not found in your scan history.");

    $("#studentName").textContent = match.student_name;
    $("#studentEmail").textContent = match.student_email;
    $("#companyCvFile").textContent = match.original_name;

    const fileUrl = `${API_BASE_URL}${match.cv}`;
    $("#downloadCvLink").href = fileUrl;
    $("#previewFrame").innerHTML = `<iframe src="${fileUrl}"></iframe>`;
  } catch (error) {
    showNotice(notice, error.message, "error");
  }
});
