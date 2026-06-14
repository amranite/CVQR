// This is for local development.
window.CVQR_CONFIG = {
  API_BASE_URL: localStorage.getItem('cvqr_api_base') || 'http://localhost:3000'
};

// This is for demonstration purposes.
// window.CVQR_CONFIG = {
//   API_BASE_URL: localStorage.getItem('cvqr_api_base') || window.location.origin
// };
