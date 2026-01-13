export const captureSnapshot = (videoElement) => {
  if (!videoElement) return null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoElement, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.5);
  } catch (e) {
    console.error("Snapshot failed", e);
    return null;
  }
};
