const COMPANY = {
  name: "Soltech Energy",
  whatsapp: "8302573979",
  consultationMessage: "Hi, I would like a free consultation regarding solar installation.",
  panelCount: 8,
};

const $ = (selector) => document.querySelector(selector);
const visualizer = $("#solarVisualizer");
const camera = $("#camera");
const canvas = $("#solarCanvas");
const ctx = canvas.getContext("2d");
const captureCanvas = $("#captureCanvas");
const captureCtx = captureCanvas.getContext("2d");

const state = { running: false, demo: false, rating: 0, startedAt: 0, stream: null, animation: null };

function resizeCanvas() {
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  const stage = document.querySelector(".visualizer-stage");
  const rect = stage?.getBoundingClientRect() || { width: innerWidth, height: innerHeight };
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function size() {
  const rect = canvas.getBoundingClientRect();
  return { w: rect.width || innerWidth, h: rect.height || innerHeight };
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function openSolarVisualizer() {
  visualizer.hidden = false;
  document.body.style.overflow = "hidden";
  resizeCanvas();
  startCamera();
}

function closeSolarVisualizer() {
  stopCamera();
  visualizer.hidden = true;
  document.body.style.overflow = "";
  $("#feedbackDialog").hidden = true;
  $("#cameraError").hidden = true;
}

async function startCamera() {
  $("#cameraError").hidden = true;
  state.demo = false;
  state.startedAt = performance.now();
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 1920 } },
      audio: false,
    });
    camera.srcObject = state.stream;
    await camera.play();
    state.running = true;
    animate();
    showToast("Camera opened. Point at the roof.");
  } catch (error) {
    state.running = false;
    $("#cameraError").hidden = false;
  }
}

function startDemo() {
  $("#cameraError").hidden = true;
  state.demo = true;
  state.running = true;
  camera.srcObject = null;
  state.startedAt = performance.now();
  animate();
  showToast("Demo preview started.");
}

function stopCamera() {
  state.running = false;
  cancelAnimationFrame(state.animation);
  if (state.stream) {
    state.stream.getTracks().forEach((track) => track.stop());
    state.stream = null;
  }
  camera.srcObject = null;
  const { w, h } = size();
  ctx.clearRect(0, 0, w, h);
}

function roofPolygon(time = performance.now()) {
  const { w, h } = size();
  const drift = Math.sin(time / 1700) * 5;
  const top = h * 0.34 + drift;
  const bottom = h * 0.62 + drift * 0.35;
  const left = w * 0.14;
  const right = w * 0.88;
  return [
    { x: left + w * 0.08, y: top + h * 0.035 },
    { x: right - w * 0.04, y: top - h * 0.035 },
    { x: right, y: bottom + h * 0.045 },
    { x: left, y: bottom },
  ];
}

function bilerp(poly, u, v) {
  const top = { x: poly[0].x + (poly[1].x - poly[0].x) * u, y: poly[0].y + (poly[1].y - poly[0].y) * u };
  const bottom = { x: poly[3].x + (poly[2].x - poly[3].x) * u, y: poly[3].y + (poly[2].y - poly[3].y) * u };
  return { x: top.x + (bottom.x - top.x) * v, y: top.y + (bottom.y - top.y) * v };
}

function panelCells() {
  const { w } = size();
  const cols = w < 430 ? 4 : 5;
  const rows = Math.ceil(COMPANY.panelCount / cols);
  const cells = [];
  const width = 0.72;
  const height = Math.min(0.66, rows * 0.22);
  const startU = (1 - width) / 2;
  const startV = 0.19;
  const gapU = 0.018;
  const gapV = 0.028;
  const cellW = (width - gapU * (cols - 1)) / cols;
  const cellH = (height - gapV * (rows - 1)) / rows;
  for (let index = 0; index < COMPANY.panelCount; index++) {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const u = startU + col * (cellW + gapU);
    const v = startV + row * (cellH + gapV);
    cells.push([{ u, v }, { u: u + cellW, v }, { u: u + cellW, v: v + cellH }, { u, v: v + cellH }]);
  }
  return cells;
}

function drawPolygon(context, points, fill, stroke, lineWidth = 1) {
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
  context.closePath();
  if (fill) { context.fillStyle = fill; context.fill(); }
  if (stroke) { context.strokeStyle = stroke; context.lineWidth = lineWidth; context.stroke(); }
}

function drawPanel(context, poly, cell, opacity = 1) {
  const base = cell.map((point) => bilerp(poly, point.u, point.v));
  const map = (s, t, inset = 0) => {
    const su = inset + (1 - inset * 2) * s;
    const tv = inset + (1 - inset * 2) * t;
    const top = { x: base[0].x + (base[1].x - base[0].x) * su, y: base[0].y + (base[1].y - base[0].y) * su };
    const bottom = { x: base[3].x + (base[2].x - base[3].x) * su, y: base[3].y + (base[2].y - base[3].y) * su };
    return { x: top.x + (bottom.x - top.x) * tv, y: top.y + (bottom.y - top.y) * tv };
  };
  const insetQuad = (amount) => [map(0, 0, amount), map(1, 0, amount), map(1, 1, amount), map(0, 1, amount)];
  const frame = base;
  const glass = insetQuad(.055);
  const sideDepth = Math.max(4, Math.min(9, Math.hypot(base[3].x - base[0].x, base[3].y - base[0].y) * .06));
  const side = [base[3], base[2], { x: base[2].x + sideDepth * .7, y: base[2].y + sideDepth }, { x: base[3].x + sideDepth * .7, y: base[3].y + sideDepth }];

  context.save();
  context.globalAlpha = opacity;
  context.shadowColor = "rgba(0,0,0,.48)";
  context.shadowBlur = 14;
  context.shadowOffsetY = 8;
  drawPolygon(context, side, "#050b14", "rgba(255,255,255,.16)", 1);

  const frameGradient = context.createLinearGradient(frame[0].x, frame[0].y, frame[2].x, frame[2].y);
  frameGradient.addColorStop(0, "#d9e2ea");
  frameGradient.addColorStop(.18, "#7f8d9b");
  frameGradient.addColorStop(.55, "#f3f7fa");
  frameGradient.addColorStop(1, "#596774");
  drawPolygon(context, frame, frameGradient, "rgba(255,255,255,.92)", 1.1);

  context.shadowColor = "transparent";
  const glassGradient = context.createLinearGradient(glass[0].x, glass[0].y, glass[2].x, glass[2].y);
  glassGradient.addColorStop(0, "#174d82");
  glassGradient.addColorStop(.28, "#0b2857");
  glassGradient.addColorStop(.63, "#071a39");
  glassGradient.addColorStop(1, "#031020");
  drawPolygon(context, glass, glassGradient, "rgba(180,213,232,.75)", .8);

  context.save();
  context.beginPath();
  context.moveTo(glass[0].x, glass[0].y);
  glass.slice(1).forEach((point) => context.lineTo(point.x, point.y));
  context.closePath();
  context.clip();

  const cols = 6;
  const rows = 10;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const gap = .012;
      const s0 = c / cols + gap;
      const s1 = (c + 1) / cols - gap;
      const t0 = r / rows + gap;
      const t1 = (r + 1) / rows - gap;
      const shade = (r + c) % 2 ? "rgba(28,88,143,.58)" : "rgba(18,65,121,.62)";
      drawPolygon(context, [map(s0,t0,.075), map(s1,t0,.075), map(s1,t1,.075), map(s0,t1,.075)], shade, "rgba(217,235,245,.13)", .45);
    }
  }

  context.strokeStyle = "rgba(220,238,247,.32)";
  context.lineWidth = .65;
  for (let c = 1; c < cols; c++) { const a = map(c / cols, 0, .075); const b = map(c / cols, 1, .075); context.beginPath(); context.moveTo(a.x,a.y); context.lineTo(b.x,b.y); context.stroke(); }
  for (let r = 1; r < rows; r++) { const a = map(0, r / rows, .075); const b = map(1, r / rows, .075); context.beginPath(); context.moveTo(a.x,a.y); context.lineTo(b.x,b.y); context.stroke(); }

  const glare = context.createLinearGradient(glass[0].x, glass[0].y, glass[2].x, glass[2].y);
  glare.addColorStop(0, "rgba(255,255,255,.34)");
  glare.addColorStop(.16, "rgba(255,255,255,.08)");
  glare.addColorStop(.42, "rgba(255,255,255,0)");
  glare.addColorStop(.72, "rgba(129,210,255,.11)");
  glare.addColorStop(1, "rgba(255,255,255,.04)");
  context.fillStyle = glare;
  context.fillRect(Math.min(...glass.map(p=>p.x))-4, Math.min(...glass.map(p=>p.y))-4, Math.max(...glass.map(p=>p.x))-Math.min(...glass.map(p=>p.x))+8, Math.max(...glass.map(p=>p.y))-Math.min(...glass.map(p=>p.y))+8);
  context.restore();

  context.strokeStyle = "rgba(255,255,255,.78)";
  context.lineWidth = .9;
  drawPolygon(context, glass, null, "rgba(232,242,248,.72)", .9);
  context.restore();
}

function drawDemoBackground(context = ctx) {
  const { w, h } = size();
  const gradient = context.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, "#9fc9ea");
  gradient.addColorStop(.45, "#d8e3ee");
  gradient.addColorStop(.46, "#6e7682");
  gradient.addColorStop(1, "#1a202c");
  context.fillStyle = gradient;
  context.fillRect(0, 0, w, h);
  const roof = roofPolygon();
  drawPolygon(context, roof, "rgba(80,86,95,.88)", "rgba(255,255,255,.18)", 1);
  context.strokeStyle = "rgba(255,255,255,.08)";
  for (let y = h * .38; y < h * .64; y += 26) { context.beginPath(); context.moveTo(0, y); context.lineTo(w, y - 36); context.stroke(); }
}

function drawOverlay() {
  const { w, h } = size();
  ctx.clearRect(0, 0, w, h);
  if (state.demo) drawDemoBackground(ctx);
  const poly = roofPolygon();
  const elapsed = performance.now() - state.startedAt;
  const alpha = Math.min(1, elapsed / 900);
  drawPolygon(ctx, poly, "rgba(255,194,10,.08)", "rgba(255,194,10,.58)", 1.2);
  panelCells().forEach((cell, index) => drawPanel(ctx, poly, cell, alpha * Math.min(1, Math.max(0, (elapsed - index * 55) / 420))));
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,.9)";
  ctx.font = "800 12px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("Automatic solar preview", w / 2, poly[0].y - 18);
  ctx.restore();
}

function animate() {
  if (!state.running) return;
  drawOverlay();
  state.animation = requestAnimationFrame(animate);
}

function drawVideoTo(context, width, height) {
  if (state.demo || !camera.videoWidth || !camera.videoHeight) {
    context.fillStyle = "#9fc9ea";
    context.fillRect(0, 0, width, height);
    return;
  }
  const videoRatio = camera.videoWidth / camera.videoHeight;
  const outputRatio = width / height;
  let sx = 0, sy = 0, sw = camera.videoWidth, sh = camera.videoHeight;
  if (videoRatio > outputRatio) { sw = camera.videoHeight * outputRatio; sx = (camera.videoWidth - sw) / 2; }
  else { sh = camera.videoWidth / outputRatio; sy = (camera.videoHeight - sh) / 2; }
  context.drawImage(camera, sx, sy, sw, sh, 0, 0, width, height);
}

function capturePreview() {
  const width = camera.videoWidth || 1080;
  const height = camera.videoHeight || 1600;
  captureCanvas.width = width;
  captureCanvas.height = height;
  captureCtx.clearRect(0, 0, width, height);
  drawVideoTo(captureCtx, width, height);
  const stage = size();
  const scaleX = width / stage.w;
  const scaleY = height / stage.h;
  captureCtx.save();
  captureCtx.scale(scaleX, scaleY);
  const poly = roofPolygon();
  panelCells().forEach((cell) => drawPanel(captureCtx, poly, cell, 1));
  captureCtx.restore();
  const band = height * .16;
  const shade = captureCtx.createLinearGradient(0, height - band, 0, height);
  shade.addColorStop(0, "rgba(7,21,45,0)");
  shade.addColorStop(.4, "rgba(7,21,45,.88)");
  captureCtx.fillStyle = shade;
  captureCtx.fillRect(0, height - band, width, band);
  captureCtx.fillStyle = "#ffc20a";
  captureCtx.font = `900 ${Math.round(width * .037)}px system-ui`;
  captureCtx.fillText(COMPANY.name, width * .05, height - band * .38);
  captureCtx.fillStyle = "#ffffff";
  captureCtx.font = `700 ${Math.round(width * .026)}px system-ui`;
  captureCtx.fillText(`${COMPANY.panelCount} panels 3D solar preview`, width * .05, height - band * .16);
  $("#flash").classList.remove("active");
  requestAnimationFrame(() => $("#flash").classList.add("active"));
  captureCanvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `soltech-solar-preview-${Date.now()}.jpg`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1400);
    $("#feedbackDialog").hidden = false;
    showToast("Preview saved.");
  }, "image/jpeg", .92);
}

function setRating(value) {
  state.rating = value;
  document.querySelectorAll("[data-rating]").forEach((button) => button.classList.toggle("active", Number(button.dataset.rating) <= value));
}

function submitFeedback() {
  localStorage.setItem("soltech_visualizer_feedback", JSON.stringify({ rating: state.rating, comment: $("#feedbackComment").value.trim(), date: new Date().toISOString() }));
  $("#feedbackDialog").hidden = true;
  showToast("Thank you for your feedback.");
}

function openWhatsApp() {
  const message = COMPANY.consultationMessage;
  if (!COMPANY.whatsapp) { showToast("Add your WhatsApp number inside app.js first."); return; }
  window.open(`https://wa.me/${COMPANY.whatsapp}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
}

$("#closeButton").addEventListener("click", closeSolarVisualizer);
$("#captureButton").addEventListener("click", capturePreview);
$("#whatsAppButton").addEventListener("click", openWhatsApp);
$("#retryButton").addEventListener("click", startCamera);
$("#demoButton").addEventListener("click", startDemo);
$("#submitFeedbackButton").addEventListener("click", submitFeedback);
document.querySelectorAll("[data-rating]").forEach((button) => button.addEventListener("click", () => setRating(Number(button.dataset.rating))));
document.querySelectorAll("[data-close-feedback]").forEach((button) => button.addEventListener("click", () => ($("#feedbackDialog").hidden = true)));
window.addEventListener("resize", resizeCanvas);
window.openSolarVisualizer = openSolarVisualizer;
window.closeSolarVisualizer = closeSolarVisualizer;
resizeCanvas();





