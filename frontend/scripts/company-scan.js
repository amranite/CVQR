document.addEventListener("DOMContentLoaded", async () => {
  if (!requireAuth(["company"])) return;

  const notice = $("#scanNotice");
  const manualTokenInput = $("#manualToken");
  const scanButton = $("#scanManualButton");
  const video = $("#scannerVideo");

  let stream = null;
  let scanInterval = null;
  let lastToken = null;

  async function openScannedCv(token) {
    if (!token || token === lastToken) return;
    lastToken = token;

    try {
      const result = await apiFetch(`/qr/${encodeURIComponent(token)}`);
      localStorage.setItem("cvqr_last_scan", JSON.stringify({ token, ...result, scannedAt: new Date().toISOString() }));

      let cvId = null;
      try {
        const scans = await apiFetch("/company/scans");
        const matched = scans.find((entry) => entry.original_name === result.original_name && entry.cv === result.cv);
        if (matched) cvId = matched.cv_id;
      } catch {
        // keep fallback path below
      }

      window.location.href = cvId ? `company-cv.html?cv_id=${encodeURIComponent(cvId)}` : "company-history.html";
    } catch (error) {
      lastToken = null;
      showNotice(notice, error.message, "error");
    }
  }

  scanButton.addEventListener("click", () => {
    const raw = manualTokenInput.value.trim();
    const token = raw.includes("/qr/") ? raw.split("/qr/").pop() : raw;
    if (!token) {
      showNotice(notice, "Paste a token or full QR URL first.", "error");
      return;
    }
    openScannedCv(token);
  });

  if (!navigator.mediaDevices?.getUserMedia) {
    showNotice(notice, "Camera access is not available in this browser. Use the manual token field instead.", "error");
    return;
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    video.srcObject = stream;
  } catch {
    showNotice(notice, "Camera permission was blocked. Use the manual token field instead.", "error");
    return;
  }

  if (!("BarcodeDetector" in window)) {
    showNotice(notice, "This browser cannot scan QR codes automatically. Use the manual token field instead.", "info");
    return;
  }

  const detector = new BarcodeDetector({ formats: ["qr_code"] });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  scanInterval = window.setInterval(async () => {
    if (!video.videoWidth || !video.videoHeight) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      const codes = await detector.detect(canvas);
      if (!codes.length) return;
      const rawValue = codes[0].rawValue || "";
      const token = rawValue.includes("/qr/") ? rawValue.split("/qr/").pop() : rawValue;
      if (token) openScannedCv(token);
    } catch {
      // ignore intermittent detector errors
    }
  }, 900);

  window.addEventListener("beforeunload", () => {
    if (scanInterval) clearInterval(scanInterval);
    if (stream) stream.getTracks().forEach((track) => track.stop());
  });
});
