const API_BASE_URL = localStorage.getItem("cvqr_api_base") || "http://localhost:3000";

function $(selector) {
  return document.querySelector(selector);
}

function setApiBase(url) {
  localStorage.setItem("cvqr_api_base", url.trim().replace(/\/$/, ""));
}

function getToken() {
  return localStorage.getItem("cvqr_token");
}

function getRole() {
  return localStorage.getItem("cvqr_role");
}

function setSession(token, role) {
  localStorage.setItem("cvqr_token", token);
  localStorage.setItem("cvqr_role", role);
}

function clearSession() {
  localStorage.removeItem("cvqr_token");
  localStorage.removeItem("cvqr_role");
  localStorage.removeItem("cvqr_last_scan");
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMessage = typeof data === "object" && data?.error ? data.error : `Request failed (${response.status})`;
    const error = new Error(errorMessage);
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

function showNotice(target, message, type = "info") {
  if (!target) return;
  target.className = `notice notice-${type}`;
  target.textContent = message;
  target.classList.remove("hidden");
}

function hideNotice(target) {
  if (!target) return;
  target.classList.add("hidden");
  target.textContent = "";
}

function formatDate(dateValue, withTime = false) {
  if (!dateValue) return "—";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;
  return new Intl.DateTimeFormat("en-BE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {})
  }).format(date);
}

function relativeScanLabel(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startToday - startTarget) / 86400000);
  const timeText = new Intl.DateTimeFormat("en-BE", { hour: "2-digit", minute: "2-digit" }).format(date);
  if (diffDays === 0) return `Scanned today · ${timeText}`;
  if (diffDays === 1) return `Scanned yesterday · ${timeText}`;
  return `Scanned ${formatDate(date)} · ${timeText}`;
}

async function resolveUserRole() {
  const token = getToken();
  if (!token) return null;
  try {
    await apiFetch("/cv/me");
    localStorage.setItem("cvqr_role", "student");
    return "student";
  } catch (studentError) {
    if (studentError.status !== 403 && studentError.status !== 404) {
      if (studentError.status === 401) return null;
    }
  }

  try {
    await apiFetch("/company/scans");
    localStorage.setItem("cvqr_role", "company");
    return "company";
  } catch (companyError) {
    if (companyError.status !== 403 && companyError.status !== 401) {
      return "company";
    }
  }

  try {
    await apiFetch("/admin/cvs");
    localStorage.setItem("cvqr_role", "admin");
    return "admin";
  } catch {
    return localStorage.getItem("cvqr_role") || null;
  }
}

function requireAuth(roles = []) {
  const token = getToken();
  const role = getRole();
  if (!token) {
    window.location.href = "login.html";
    return false;
  }
  if (roles.length && role && !roles.includes(role)) {
    redirectByRole(role);
    return false;
  }
  return true;
}

function redirectByRole(role) {
  if (role === "student") window.location.href = "student.html";
  else if (role === "company") window.location.href = "company-scan.html";
  else if (role === "admin") window.location.href = "admin.html";
  else window.location.href = "login.html";
}

function bindLogout(selector = "[data-logout]") {
  document.querySelectorAll(selector).forEach((element) => {
    element.addEventListener("click", (event) => {
      event.preventDefault();
      clearSession();
      window.location.href = "login.html";
    });
  });
}

function setCurrentTime() {
  document.querySelectorAll("[data-current-time]").forEach((element) => {
    element.textContent = new Intl.DateTimeFormat("en-BE", {
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date());
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setCurrentTime();
  bindLogout();
});
