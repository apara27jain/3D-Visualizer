const camera = document.querySelector("#camera");
const welcome = document.querySelector("#welcome");
const viewer = document.querySelector("#viewer");
const cameraError = document.querySelector("#cameraError");
const panelStage = document.querySelector("#panelStage");
const panelArray = document.querySelector("#panelArray");
const scaleControl = document.querySelector("#scaleControl");
const rotateControl = document.querySelector("#rotateControl");
const panelTotal = document.querySelector("#panelTotal");
const systemSize = document.querySelector("#systemSize");
const annualEnergy = document.querySelector("#annualEnergy");
const layoutValue = document.querySelector("#layoutValue");
const captureCanvas = document.querySelector("#captureCanvas");
const flash = document.querySelector("#flash");
const toast = document.querySelector("#toast");

let stream;
let columns = 4;
let rows = 2;
let position = { x: 0, y: 0 };
let dragStart = null;
let toastTimer;

function buildPanels() {
  const total = columns * rows;
  panelArray.replaceChildren();
  panelArray.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;

  for (let index = 0; index < total; index += 1) {
    const panel = document.createElement("span");
    panel.className = "solar-panel";
    panelArray.append(panel);
  }

  panelTotal.textContent = total;
  systemSize.textContent = (total * 0.4).toFixed(1);
  annualEnergy.textContent = Math.round(total * 600).toLocaleString();
  layoutValue.textContent = `${columns} × ${rows}`;
}

function updateTransform() {
  panelStage.style.setProperty("--x", `${position.x}px`);
  panelStage.style.setProperty("--y", `${position.y}px`);
  panelStage.style.setProperty("--scale", Number(scaleControl.value) / 100);
  panelStage.style.setProperty("--rotation", `${rotateControl.value}deg`);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    showCameraError();
    return;
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    });
    camera.srcObject = stream;
    await camera.play();
    welcome.hidden = true;
    cameraError.hidden = true;
    viewer.hidden = false;
  } catch {
    showCameraError();
  }
}

function showCameraError() {
  welcome.hidden = true;
  viewer.hidden = true;
  cameraError.hidden = false;
}

function stopCamera() {
  stream?.getTracks().forEach((track) => track.stop());
  stream = undefined;
  camera.srcObject = null;
}

function openDemo() {
  cameraError.hidden = true;
  welcome.hidden = true;
  viewer.hidden = false;
  camera.style.background =
    "linear-gradient(155deg, #78939b 0 35%, #594c42 36% 56%, #2e382d 57%)";
  showToast("Demo mode — camera is off");
}

function resetPreview() {
  columns = 4;
  rows = 2;
  position = { x: 0, y: 0 };
  scaleControl.value = 100;
  rotateControl.value = -8;
  buildPanels();
  updateTransform();
  showToast("Preview reset");
}

function changeLayout(direction) {
  const current = columns * rows;
  if (direction > 0 && current < 18) {
    if (columns < 6) columns += 1;
    else rows += 1;
  }
  if (direction < 0 && current > 2) {
    if (columns > 2) columns -= 1;
    else rows -= 1;
  }
  buildPanels();
}

function beginDrag(event) {
  if (event.target.closest(".viewer-footer")) return;
  panelStage.setPointerCapture?.(event.pointerId);
  dragStart = {
    pointerX: event.clientX,
    pointerY: event.clientY,
    stageX: position.x,
    stageY: position.y,
  };
  panelStage.querySelector(".drag-hint").style.opacity = "0";
}

function movePanel(event) {
  if (!dragStart) return;
  position.x = dragStart.stageX + event.clientX - dragStart.pointerX;
  position.y = dragStart.stageY + event.clientY - dragStart.pointerY;
  updateTransform();
}

function endDrag() {
  dragStart = null;
}

async function capturePreview() {
  if (!camera.videoWidth || !camera.videoHeight) {
    showToast("Camera preview is needed to save an image");
    return;
  }

  const width = camera.videoWidth;
  const height = camera.videoHeight;
  captureCanvas.width = width;
  captureCanvas.height = height;
  const context = captureCanvas.getContext("2d");

  context.drawImage(camera, 0, 0, width, height);

  const stageRect = panelStage.getBoundingClientRect();
  const videoRect = camera.getBoundingClientRect();
  const scaleX = width / videoRect.width;
  const scaleY = height / videoRect.height;
  const panelWidth = stageRect.width * scaleX;
  const panelHeight = stageRect.height * scaleY;
  const x = (stageRect.left - videoRect.left) * scaleX;
  const y = (stageRect.top - videoRect.top) * scaleY;

  context.save();
  context.translate(x + panelWidth / 2, y + panelHeight / 2);
  context.rotate((Number(rotateControl.value) * Math.PI) / 180);
  context.translate(-panelWidth / 2, -panelHeight / 2);

  const gap = Math.max(3, panelWidth * 0.008);
  const cellWidth = (panelWidth - gap * (columns + 1)) / columns;
  const cellHeight = (panelHeight - gap * (rows + 1)) / rows;

  context.fillStyle = "#293735";
  context.fillRect(0, 0, panelWidth, panelHeight);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const px = gap + column * (cellWidth + gap);
      const py = gap + row * (cellHeight + gap);
      const gradient = context.createLinearGradient(px, py, px + cellWidth, py + cellHeight);
      gradient.addColorStop(0, "#1b5279");
      gradient.addColorStop(0.55, "#071e34");
      gradient.addColorStop(1, "#123752");
      context.fillStyle = gradient;
      context.fillRect(px, py, cellWidth, cellHeight);
      context.strokeStyle = "#adbbb7";
      context.lineWidth = Math.max(2, panelWidth * 0.004);
      context.strokeRect(px, py, cellWidth, cellHeight);
    }
  }
  context.restore();

  flash.classList.remove("active");
  requestAnimationFrame(() => flash.classList.add("active"));

  captureCanvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `solar-roof-preview-${Date.now()}.jpg`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("Preview saved to your device");
  }, "image/jpeg", 0.92);
}

document.querySelector("#startButton").addEventListener("click", startCamera);
document.querySelector("#retryButton").addEventListener("click", startCamera);
document.querySelector("#demoButton").addEventListener("click", openDemo);
document.querySelector("#closeButton").addEventListener("click", () => {
  stopCamera();
  viewer.hidden = true;
  welcome.hidden = false;
});
document.querySelector("#resetButton").addEventListener("click", resetPreview);
document.querySelector("#captureButton").addEventListener("click", capturePreview);

document.querySelectorAll(".stepper button").forEach((button) => {
  button.addEventListener("click", () => {
    changeLayout(button.dataset.action === "add" ? 1 : -1);
  });
});

scaleControl.addEventListener("input", updateTransform);
rotateControl.addEventListener("input", updateTransform);
panelStage.addEventListener("pointerdown", beginDrag);
panelStage.addEventListener("pointermove", movePanel);
panelStage.addEventListener("pointerup", endDrag);
panelStage.addEventListener("pointercancel", endDrag);

buildPanels();
updateTransform();
