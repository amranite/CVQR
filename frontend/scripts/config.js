// The frontend and API are served from the same origin, including HTTPS tunnels.
window.CVQR_CONFIG = {
  API_BASE_URL: localStorage.getItem('cvqr_api_base') || window.location.origin
};
