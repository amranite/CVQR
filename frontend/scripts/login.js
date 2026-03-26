document.addEventListener("DOMContentLoaded", () => {
  const apiBaseInput = $("#apiBase");
  const notice = $("#loginNotice");
  apiBaseInput.value = API_BASE_URL;

  $("#loginButton").addEventListener("click", async () => {
    hideNotice(notice);
    const email = $("#email").value.trim();
    const password = $("#password").value;
    const apiBase = apiBaseInput.value.trim();

    if (!email || !password || !apiBase) {
      showNotice(notice, "Fill in all fields first.", "error");
      return;
    }

    try {
      setApiBase(apiBase);
      const response = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      localStorage.setItem("cvqr_token", response.token);
      const role = await resolveUserRole();
      if (!role) {
        clearSession();
        throw new Error("Login worked, but the app could not determine the account role.");
      }
      setSession(response.token, role);
      redirectByRole(role);
    } catch (error) {
      showNotice(notice, error.message, "error");
    }
  });
});
