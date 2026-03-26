document.addEventListener("DOMContentLoaded", () => {
  const apiBaseInput = $("#apiBase");
  const notice = $("#registerNotice");
  apiBaseInput.value = API_BASE_URL;

  $("#registerButton").addEventListener("click", async () => {
    hideNotice(notice);
    const name = $("#name").value.trim();
    const email = $("#email").value.trim();
    const password = $("#password").value;
    const apiBase = apiBaseInput.value.trim();

    if (!name || !email || !password || !apiBase) {
      showNotice(notice, "Fill in all fields first.", "error");
      return;
    }

    try {
      setApiBase(apiBase);
      await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password })
      });
      showNotice(notice, "Account created. You can log in now.", "success");
      setTimeout(() => { window.location.href = "login.html"; }, 700);
    } catch (error) {
      showNotice(notice, error.message, "error");
    }
  });
});
