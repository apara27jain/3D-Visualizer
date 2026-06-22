/* Replace these values with your company's real information. */
const COMPANY = {
  name: "Soltech Energy",
  whatsapp: "918302573979", 
  panelWatts: 550,
  annualYieldPerKw: 1600,
  electricityRate: 8,
  pricePerKwMin: 50000,
  pricePerKwMax: 65000,
  currency: "₹",
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const camera = $("#camera");
const canvas = $("#solarCanvas");
const ctx = canvas.getContext("2d");
const captureCanvas = $("#captureCanvas");
const captureCtx = captureCanvas.getContext("2d");
const resultCanvas = $("#resultCanvas");
const resultCtx = resultCanvas.getContext("2d");

const screens = {
  welcome: $("#welcome"),
  viewer: $("#viewer"),
  results: $("#results"),
  error: $("#cameraError"),
};

const state = {
  stream: null,
  demo: false,
  phase: "map",
  locked: false,
  count: 8,
  orientation: "landscape",
  spacing: 6,
  scale: 1,
  rotation: 0,
  offset: { x: 0, y: 0 },
  roof: [],
  obstacles: [],
  history: [],
  pointers: new Map(),
  gesture: null,
  draggingHandle: null,
  draggingObstacle: null,
  lastComposite: null,
};

const UI = {
  cornerHandles: $$(".roof-handle"),
  mapPanel: $("#mapPanel"),
  designPanel: $("#designPanel"),
  progressBars: $$(".progress span"),
  stepLabel: $("#stepLabel"),
  guidanceTitle: $("#guidanceTitle"),
  guidanceText: $("#guidanceText"),
  guidanceIcon: $("#guidanceIcon"),
  gestureHint: $("#gestureHint"),
  systemSize: $("#systemSize"),
  annualEnergy: $("#annualEnergy"),
  annualSavings: $("#annualSavings"),
  panelCount: $("#panelCount"),
  layoutSummary: $("#layoutSummary"),
  spacingControl: $("#spacingControl"),
  scaleControl: $("#scaleControl"),
  rotateControl: $("#rotateControl"),
  spacingOutput: $("#spacingOutput"),
  scaleOutput: $("#scaleOutput"),
  rotateOutput: $("#rotateOutput"),
  lockButton: $("#lockButton"),
  undoButton: $("#undoButton"),
  toast: $("#toast"),
};

let toastTimer;
let hintTimer;

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = innerWidth;
  const height = innerHeight;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  if (!state.roof.length) {
    state.roof = [
      { x: width * 0.16, y: height * 0.24 },
      { x: width * 0.84, y: height * 0.22 },
      { x: width * 0.88, y: height * 0.54 },
      { x: width * 0.12, y: height * 0.56 },
    ];
  }
  draw();
  positionHandles();
}

function showOnly(name) {
  Object.entries(screens).forEach(([key, element]) => {
    element.hidden = key !== name;
  });
}

function showToast(message) {
  UI.toast.textContent = message;
  UI.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => UI.toast.classList.remove("show"), 2400);
}

function defaultRoof() {
  const width = innerWidth;
  const height = innerHeight;
  state.roof = [
    { x: width * 0.30, y: height * 0.30 },
    { x: width * 0.70, y: height * 0.30 },
    { x: width * 0.70, y: height * 0.60 },
    { x: width * 0.30, y: height * 0.60 }
  ];
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) return showOnly("error");
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    });
    camera.srcObject = state.stream;
    await camera.play();
    state.demo = false;
    $("#demoScene").hidden = true;
    beginDesigner();
  } catch {
    showOnly("error");
  }
}

function stopCamera() {
  state.stream?.getTracks().forEach((track) => track.stop());
  state.stream = null;
  camera.srcObject = null;
}

function startDemo() {
  stopCamera();
  state.demo = true;
  $("#demoScene").hidden = false;
  beginDesigner();
}

function beginDesigner() {
  showOnly("viewer");
  state.phase = "map";
  state.obstacles = [];
  defaultRoof();
  setPhase("map");
  resizeCanvas();
  document
    .getElementById("cameraInstruction")
    .style.display = "block";
  document
    .getElementById("gotItButton")
    .addEventListener("click",()=>{
  document
    .getElementById("cameraInstruction")
    .style.display = "none";
  });
}

function setPhase(phase) {
  state.phase = phase;
  const mapping = phase === "map";
  UI.mapPanel.classList.toggle("active", mapping);
  UI.designPanel.classList.toggle("active", !mapping);
  $("#cornerHandles").hidden = !mapping;
  UI.gestureHint.hidden = mapping;
  UI.progressBars.forEach((bar, index) => bar.classList.toggle("active", index <= (mapping ? 0 : 1)));
  UI.stepLabel.textContent = mapping ? "Frame your roof" : "Design your system";
  UI.guidanceIcon.textContent = mapping ? "⌗" : "✦";
  UI.guidanceTitle.textContent = mapping ? "Fit the guide to your roof" : "Place panels inside the roof";
  UI.guidanceText.textContent = mapping ? "Drag each corner onto the roof edges" : "Drag, pinch and rotate to refine";
  positionHandles();
  draw();
  if (!mapping) {
    clearTimeout(hintTimer);
    UI.gestureHint.hidden = false;
    hintTimer = setTimeout(() => (UI.gestureHint.hidden = true), 5000);
  }
}

function positionHandles() {
  UI.cornerHandles.forEach((handle, index) => {
    const point = state.roof[index];
    if (!point) return;
    handle.style.left = `${point.x}px`;
    handle.style.top = `${point.y}px`;
  });
}

function bilerp(u, v) {
  const [a, b, c, d] = state.roof;
  return {
    x: (1 - u) * (1 - v) * a.x + u * (1 - v) * b.x + u * v * c.x + (1 - u) * v * d.x,
    y: (1 - u) * (1 - v) * a.y + u * (1 - v) * b.y + u * v * c.y + (1 - u) * v * d.y,
  };
}

function transformUV(u, v) {
  let x = u - 0.5;
  let y = v - 0.5;
  const angle = (state.rotation * Math.PI) / 180;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const nx = (x * cosine - y * sine) * state.scale + state.offset.x;
  const ny = (x * sine + y * cosine) * state.scale + state.offset.y;
  return { u: nx + 0.5, v: ny + 0.5 };
}

function panelGrid() {
  const aspect = state.orientation === "landscape" ? 1.7 : 0.59;
  const columns = Math.max(1, Math.ceil(Math.sqrt(state.count * aspect)));
  const rows = Math.ceil(state.count / columns);
  const margin = 0.055;
  const gap = 0.012 + state.spacing * 0.0011;
  const cellW = (1 - margin * 2 - gap * (columns - 1)) / columns;
  const cellH = (1 - margin * 2 - gap * (rows - 1)) / rows;
  const panels = [];
  let created = 0;

  for (let row = 0; row < rows && created < state.count; row += 1) {
    for (let column = 0; column < columns && created < state.count; column += 1) {
      const u = margin + column * (cellW + gap);
      const v = margin + row * (cellH + gap);
      const center = transformUV(u + cellW / 2, v + cellH / 2);
      const blocked = state.obstacles.some((obstacle) => {
        const dx = center.u - obstacle.u;
        const dy = center.v - obstacle.v;
        return Math.hypot(dx, dy) < obstacle.radius;
      });
      if (!blocked) {
        panels.push({
          corners: [
            transformUV(u, v),
            transformUV(u + cellW, v),
            transformUV(u + cellW, v + cellH),
            transformUV(u, v + cellH),
          ],
        });
      }
      created += 1;
    }
  }
  return panels;
}

function drawPolygon(context, points, fill, stroke, width = 1) {
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
  context.closePath();
  if (fill) { context.fillStyle = fill; context.fill(); }
  if (stroke) { context.strokeStyle = stroke; context.lineWidth = width; context.stroke(); }
}

function drawPanel(context, panel, alpha = 1) {
  const points = panel.corners.map(({ u, v }) => bilerp(u, v));
  context.save();
  context.globalAlpha = alpha;
  context.shadowColor = "rgba(0,0,0,.42)";
  context.shadowBlur = 8;
  context.shadowOffsetY = 5;
  const gradient = context.createLinearGradient(points[0].x, points[0].y, points[2].x, points[2].y);
  gradient.addColorStop(0, "#276987");
  gradient.addColorStop(0.48, "#09243b");
  gradient.addColorStop(1, "#123f5a");
  drawPolygon(context, points, gradient, "#c8d6d4", 1.5);
  context.shadowColor = "transparent";
  const topMid = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
  const bottomMid = { x: (points[3].x + points[2].x) / 2, y: (points[3].y + points[2].y) / 2 };
  const leftMid = { x: (points[0].x + points[3].x) / 2, y: (points[0].y + points[3].y) / 2 };
  const rightMid = { x: (points[1].x + points[2].x) / 2, y: (points[1].y + points[2].y) / 2 };
  context.strokeStyle = "rgba(190,220,225,.38)";
  context.lineWidth = 0.8;
  context.beginPath(); context.moveTo(topMid.x, topMid.y); context.lineTo(bottomMid.x, bottomMid.y); context.stroke();
  context.beginPath(); context.moveTo(leftMid.x, leftMid.y); context.lineTo(rightMid.x, rightMid.y); context.stroke();
  context.restore();
}

function drawObstacle(context, obstacle) {
  const center = bilerp(obstacle.u, obstacle.v);
  const edge = bilerp(Math.min(1, obstacle.u + obstacle.radius), obstacle.v);
  const radius = Math.max(18, Math.hypot(edge.x - center.x, edge.y - center.y));
  context.save();
  context.setLineDash([5, 4]);
  context.fillStyle = "rgba(255,113,77,.18)";
  context.strokeStyle = "#ff8a68";
  context.lineWidth = 2;
  context.beginPath();
  context.arc(center.x, center.y, radius, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.setLineDash([]);
  context.fillStyle = "#fff";
  context.font = "700 11px system-ui";
  context.textAlign = "center";
  context.fillText(obstacle.label, center.x, center.y + 4);
  context.restore();
}

function draw() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  if (!state.roof.length || screens.viewer.hidden) return;

  if (state.phase === "map") {
    ctx.save();
    ctx.fillStyle = "rgba(2,10,7,.34)";
    ctx.fillRect(0, 0, innerWidth, innerHeight);
    ctx.globalCompositeOperation = "destination-out";
    drawPolygon(ctx, state.roof, "black");
    ctx.restore();
    ctx.save();
    ctx.setLineDash([8, 6]);
    drawPolygon(ctx, state.roof, "rgba(71,224,143,.08)", "#68e8a6", 2);
    ctx.restore();
  } else {
    drawPolygon(ctx, state.roof, "rgba(27,110,73,.06)", "rgba(104,232,166,.7)", 1.5);
    panelGrid().forEach((panel) => drawPanel(ctx, panel));
    state.obstacles.forEach((obstacle) => drawObstacle(ctx, obstacle));
  }
}

function estimate() {
  const installedPanels = panelGrid().length;
  const capacity = installedPanels * COMPANY.panelWatts / 1000;
  const energy = capacity * COMPANY.annualYieldPerKw;
  const savings = energy * COMPANY.electricityRate;
  const costMin = capacity * COMPANY.pricePerKwMin;
  const costMax = capacity * COMPANY.pricePerKwMax;
  return { installedPanels, capacity, energy, savings, costMin, costMax, payback: savings ? ((costMin + costMax) / 2 / savings) : 0 };
}

function money(value) {
  return `${COMPANY.currency}${Math.round(value).toLocaleString("en-IN")}`;
}

function lakh(value) {
  return `${COMPANY.currency}${(value / 100000).toFixed(1)} lakh`;
}

function updateEstimates() {
  const data = estimate();
  UI.panelCount.textContent = state.count;
  UI.layoutSummary.textContent = `${data.installedPanels} active panels · ${capitalize(state.orientation)}`;
  UI.systemSize.textContent = `${data.capacity.toFixed(1)} kW`;
  UI.annualEnergy.textContent = `${Math.round(data.energy).toLocaleString("en-IN")} kWh`;
  UI.annualSavings.textContent = money(data.savings);
  UI.spacingOutput.textContent = `${state.spacing} cm`;
  UI.scaleOutput.textContent = `${Math.round(state.scale * 100)}%`;
  UI.rotateOutput.textContent = `${Math.round(state.rotation)}°`;
  draw();
}

function capitalize(text) { return text[0].toUpperCase() + text.slice(1); }

function snapshot() {
  state.history.push(JSON.stringify({
    roof: state.roof, count: state.count, orientation: state.orientation, spacing: state.spacing,
    scale: state.scale, rotation: state.rotation, offset: state.offset, obstacles: state.obstacles,
  }));
  if (state.history.length > 20) state.history.shift();
  UI.undoButton.disabled = false;
}

function undo() {
  const saved = state.history.pop();
  if (!saved) return;
  Object.assign(state, JSON.parse(saved));
  UI.undoButton.disabled = state.history.length === 0;
  syncControls();
}

function syncControls() {
  UI.spacingControl.value = state.spacing;
  UI.scaleControl.value = Math.round(state.scale * 100);
  UI.rotateControl.value = state.rotation;
  $("#landscapeButton").classList.toggle("active", state.orientation === "landscape");
  $("#portraitButton").classList.toggle("active", state.orientation === "portrait");
  updateEstimates();
  positionHandles();
}

function nearestObstacle(x, y) {
  let match = null;
  let distance = Infinity;
  state.obstacles.forEach((obstacle) => {
    const point = bilerp(obstacle.u, obstacle.v);
    const current = Math.hypot(point.x - x, point.y - y);
    if (current < 42 && current < distance) { match = obstacle; distance = current; }
  });
  return match;
}

function screenToUV(x, y) {
  let best = { u: .5, v: .5, distance: Infinity };
  for (let u = 0; u <= 1; u += .025) {
    for (let v = 0; v <= 1; v += .025) {
      const point = bilerp(u, v);
      const distance = Math.hypot(point.x - x, point.y - y);
      if (distance < best.distance) best = { u, v, distance };
    }
  }
  return best;
}

function pointDistance(a, b) { return Math.hypot(b.x - a.x, b.y - a.y); }
function pointAngle(a, b) { return Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI; }

function pointerDown(event) {
  if (state.phase !== "design" || state.locked || event.target.closest(".design-sheet") || event.target.closest(".viewer-header") || event.target.closest(".top-actions")) return;
  event.preventDefault();
  canvas.setPointerCapture?.(event.pointerId);
  state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

  const obstacle = nearestObstacle(event.clientX, event.clientY);
  if (obstacle) {
    snapshot();
    state.draggingObstacle = obstacle;
    return;
  }

  if (state.pointers.size === 1) {
    snapshot();
    state.gesture = { type: "move", start: { x: event.clientX, y: event.clientY }, offset: { ...state.offset } };
  } else if (state.pointers.size === 2) {
    const [a, b] = [...state.pointers.values()];
    state.gesture = { type: "pinch", distance: pointDistance(a, b), angle: pointAngle(a, b), scale: state.scale, rotation: state.rotation };
  }
}

function pointerMove(event) {
  if (!state.pointers.has(event.pointerId)) return;
  event.preventDefault();
  state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

  if (state.draggingObstacle) {
    const uv = screenToUV(event.clientX, event.clientY);
    state.draggingObstacle.u = Math.max(.05, Math.min(.95, uv.u));
    state.draggingObstacle.v = Math.max(.05, Math.min(.95, uv.v));
  } else if (state.pointers.size === 1 && state.gesture?.type === "move") {
    const dx = event.clientX - state.gesture.start.x;
    const dy = event.clientY - state.gesture.start.y;
    state.offset.x = state.gesture.offset.x + dx / innerWidth;
    state.offset.y = state.gesture.offset.y + dy / innerHeight;
  } else if (state.pointers.size === 2) {
    const [a, b] = [...state.pointers.values()];
    if (state.gesture?.type !== "pinch") {
      state.gesture = { type: "pinch", distance: pointDistance(a, b), angle: pointAngle(a, b), scale: state.scale, rotation: state.rotation };
    }
    state.scale = Math.max(.5, Math.min(1.25, state.gesture.scale * pointDistance(a, b) / Math.max(1, state.gesture.distance)));
    state.rotation = Math.max(-45, Math.min(45, state.gesture.rotation + pointAngle(a, b) - state.gesture.angle));
    UI.scaleControl.value = state.scale * 100;
    UI.rotateControl.value = state.rotation;
  }
  updateEstimates();
}

function pointerUp(event) {
  state.pointers.delete(event.pointerId);
  state.draggingObstacle = null;
  if (state.pointers.size === 0) state.gesture = null;
}

function startHandleDrag(event) {
  if (state.phase !== "map") return;
  event.preventDefault();
  const index = Number(event.currentTarget.dataset.corner);
  snapshot();
  state.draggingHandle = index;
  event.currentTarget.setPointerCapture?.(event.pointerId);
}

function moveHandle(event) {
  if (state.draggingHandle === null) return;
  state.roof[state.draggingHandle] = {
    x: Math.max(20, Math.min(innerWidth - 20, event.clientX)),
    y: Math.max(100, Math.min(innerHeight * .68, event.clientY)),
  };
  positionHandles();
  draw();
}

function endHandleDrag() { state.draggingHandle = null; }

function addObstacle(type) {
  snapshot();
  const labels = { tank: "Tank", chimney: "Chimney", shade: "Shade" };
  const radius = type === "shade" ? .22 : type === "tank" ? .15 : .12;
  const start = type === "shade" ? { u: .5, v: .5 } : { u: .38, v: .28 };
  state.obstacles.push({ type, label: labels[type], ...start, radius });
  updateEstimates();
  showToast(`${labels[type]} added — drag it into position`);
}

function switchControlTab(name) {
  $$("[data-control-tab]").forEach((button) => button.classList.toggle("active", button.dataset.controlTab === name));
  $$(".control-content").forEach((content) => content.classList.remove("active"));
  $(`#${name}Controls`).classList.add("active");
}

function compositePreview(targetCanvas, targetContext, branded = false) {
  const width = camera.videoWidth || 900;
  const height = camera.videoHeight || 1200;
  targetCanvas.width = width;
  targetCanvas.height = height;
  targetContext.clearRect(0, 0, width, height);

  if (state.demo) {
    const gradient = targetContext.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#85bfd0");
    gradient.addColorStop(.42, "#d8e6e4");
    gradient.addColorStop(.43, "#72594e");
    gradient.addColorStop(.75, "#3f3431");
    gradient.addColorStop(.76, "#c7bda6");
    targetContext.fillStyle = gradient;
    targetContext.fillRect(0, 0, width, height);
  } else {
    const videoRatio = camera.videoWidth / camera.videoHeight;
    const outputRatio = width / height;
    let sx = 0, sy = 0, sw = camera.videoWidth, sh = camera.videoHeight;
    if (videoRatio > outputRatio) { sw = camera.videoHeight * outputRatio; sx = (camera.videoWidth - sw) / 2; }
    else { sh = camera.videoWidth / outputRatio; sy = (camera.videoHeight - sh) / 2; }
    targetContext.drawImage(camera, sx, sy, sw, sh, 0, 0, width, height);
  }

  const scaleX = width / innerWidth;
  const scaleY = height / innerHeight;
  targetContext.save();
  targetContext.scale(scaleX, scaleY);
  panelGrid().forEach((panel) => drawPanel(targetContext, panel));
  targetContext.restore();

  if (branded) {
    const data = estimate();
    const bandHeight = height * .18;
    const gradient = targetContext.createLinearGradient(0, height - bandHeight, 0, height);
    gradient.addColorStop(0, "rgba(5,23,17,0)");
    gradient.addColorStop(.38, "rgba(5,23,17,.88)");
    targetContext.fillStyle = gradient;
    targetContext.fillRect(0, height - bandHeight, width, bandHeight);
    targetContext.fillStyle = "#68e8a6";
    targetContext.font = `800 ${Math.round(width * .035)}px system-ui`;
    targetContext.fillText(COMPANY.name, width * .05, height - bandHeight * .35);
    targetContext.fillStyle = "white";
    targetContext.font = `700 ${Math.round(width * .027)}px system-ui`;
    targetContext.fillText(`${data.installedPanels} panels  •  ${data.capacity.toFixed(1)} kW  •  ${money(data.savings)}/year estimated savings`, width * .05, height - bandHeight * .14);
  }
}

function populateResults() {
  const monthly = Math.round(data.savings / 12);
  document.getElementById("monthlySavings").textContent = money(monthly);
  const subsidy = Math.round(data.capacity * 30000);
  document.getElementById("subsidyAmount").textContent = money(subsidy);
  const data = estimate();
  compositePreview(resultCanvas, resultCtx);
  let subsidy = 0;
  if (data.capacity <= 2) {
  subsidy = 30000;
  }
  else if (data.capacity <= 3) {
  subsidy = 78000;
  }
  else {
  subsidy = 78000;
  }
  document.getElementById("subsidyAmount").textContent = money(subsidy);
  $("#resultPanelCount").textContent = `${data.installedPanels} panels`;
  $("#resultCapacity").textContent = `${data.capacity.toFixed(1)} kW system`;
  $("#resultEnergy").textContent = `${Math.round(data.energy).toLocaleString("en-IN")} kWh`;
  $("#resultSavings").textContent = money(data.savings);
  $("#lifetimeSavings").textContent = lakh(data.savings * 25);
  $("#co2Saved").textContent = `${(data.energy * .71 / 1000).toFixed(1)} tonnes`;
  $("#estimatedCost").textContent = `${lakh(data.costMin)}–${lakh(data.costMax)}`;
  $("#paybackPeriod").textContent = `Approx. ${data.payback.toFixed(1)} year payback`;
  $("#tariffAssumption").textContent = `${money(COMPANY.electricityRate)}/kWh`;
  $("#yieldAssumption").textContent = `${COMPANY.annualYieldPerKw.toLocaleString("en-IN")} kWh/kW/year`;
}

function savePreview() {
  compositePreview(captureCanvas, captureCtx, true);
  $("#flash").classList.remove("active");
  requestAnimationFrame(() => $("#flash").classList.add("active"));
  captureCanvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `solar-design-${Date.now()}.jpg`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
    showToast("Branded preview saved");
  }, "image/jpeg", .92);
}

function sharePreview() {
  compositePreview(captureCanvas, captureCtx, true);
  captureCanvas.toBlob(async (blob) => {
    const file = new File([blob], "solar-design.jpg", { type: "image/jpeg" });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ title: `${COMPANY.name} roof design`, text: "My preliminary solar roof design", files: [file] }); } catch {}
    } else savePreview();
  }, "image/jpeg", .92);
}

function openWhatsappLead() {
  const data = estimate();
  const message = `Hello Soltech Energy, I used your Solar Roof Visualizer.
  Estimated Capacity: ${data.capacity.toFixed(1)} kW
  Estimated Savings: ${money(data.savings)}
  Please contact me for a FREE site assessment.`;
  window.open( `https://wa.me/${COMPANY.whatsapp}?text=${encodeURIComponent(message)}`, "_blank");
}

$$("[data-company-name]").forEach((element) => (element.textContent = COMPANY.name));
$("#startButton").addEventListener("click", () => {
  if(typeof gtag !== "undefined")
  {
    gtag('event','visualizer_opened');
  }
});
$("#retryButton").addEventListener("click", startCamera);
$("#demoButton").addEventListener("click", startDemo);
$("#welcomeDemoButton").addEventListener("click", startDemo);
$("#closeButton").addEventListener("click", () => { stopCamera(); showOnly("welcome"); });
$("#confirmRoofButton").addEventListener("click", () => {
  if(typeof gtag !== "undefined"){
    gtag('event','roof_confirmed');
  }
  snapshot();
  setPhase("design");
  updateEstimates();
});
$("#editRoofButton").addEventListener("click", () => setPhase("map"));
$("#reviewButton").addEventListener("click", () => { if(typeof gtag !== "undefined"){
  gtag('event','results_viewed');} populateResults(); showOnly("results"); 
});
$("#backToDesignButton").addEventListener("click", () => { showOnly("viewer"); draw(); });
$("#saveButton").addEventListener("click", savePreview);
$("#shareButton").addEventListener("click", sharePreview);
$("#quoteButton").addEventListener("click",if(typeof gtag !== "undefined")
{
  gtag('event','whatsapp_clicked');
}openWhatsappLead);
$("#leadForm").addEventListener("submit", submitLead);
$$("[data-close-modal]").forEach((button) => button.addEventListener("click", () => ($("#leadModal").hidden = true)));
$("#helpButton").addEventListener("click", () => ($("#helpModal").hidden = false));
$$("[data-close-help]").forEach((button) => button.addEventListener("click", () => ($("#helpModal").hidden = true)));
$("#assumptionsToggle").addEventListener("click", () => ($("#assumptionsBody").hidden = !$("#assumptionsBody").hidden));
UI.undoButton.addEventListener("click", undo);
UI.lockButton.addEventListener("click", () => {
  state.locked = !state.locked;
  UI.lockButton.setAttribute("aria-pressed", String(state.locked));
  UI.lockButton.querySelector("span").textContent = state.locked ? "Locked" : "Lock";
  showToast(state.locked ? "Panel position locked" : "Panel position unlocked");
});
$("#addPanelButton").addEventListener("click", () => { snapshot(); state.count = Math.min(30, state.count + 2); updateEstimates(); });
$("#removePanelButton").addEventListener("click", () => { snapshot(); state.count = Math.max(2, state.count - 2); updateEstimates(); });
$("#landscapeButton").addEventListener("click", () => { snapshot(); state.orientation = "landscape"; syncControls(); });
$("#portraitButton").addEventListener("click", () => { snapshot(); state.orientation = "portrait"; syncControls(); });
UI.spacingControl.addEventListener("input", (event) => { state.spacing = Number(event.target.value); updateEstimates(); });
UI.spacingControl.addEventListener("change", snapshot);
UI.scaleControl.addEventListener("input", (event) => { state.scale = Number(event.target.value) / 100; updateEstimates(); });
UI.rotateControl.addEventListener("input", (event) => { state.rotation = Number(event.target.value); updateEstimates(); });
$("#resetFitButton").addEventListener("click", () => { snapshot(); state.scale = 1; state.rotation = 0; state.offset = { x: 0, y: 0 }; syncControls(); });
$$("[data-control-tab]").forEach((button) => button.addEventListener("click", () => switchControlTab(button.dataset.controlTab)));
$$("[data-obstacle]").forEach((button) => button.addEventListener("click", () => addObstacle(button.dataset.obstacle)));
$("#clearObstaclesButton").addEventListener("click", () => { if (state.obstacles.length) snapshot(); state.obstacles = []; updateEstimates(); });

function requestProposal(){
  const data = estimate();
  const message = `Hello Soltech Energy, I used the Solar Visualizer. I would like a detailed proposal.
  Estimated Capacity:${data.capacity.toFixed(1)} kW 
  Estimated Savings: ${money(data.savings)} 
  Please send me a proposal PDF.`;
  window.open(`https://wa.me/${COMPANY.whatsapp}?text=${encodeURIComponent(message)}`,"_blank");
}

UI.cornerHandles.forEach((handle) => {
  handle.addEventListener("pointerdown", startHandleDrag);
  handle.addEventListener("pointermove", moveHandle);
  handle.addEventListener("pointerup", endHandleDrag);
  handle.addEventListener("pointercancel", endHandleDrag);
});
canvas.addEventListener("pointerdown", pointerDown);
canvas.addEventListener("pointermove", pointerMove);
canvas.addEventListener("pointerup", pointerUp);
canvas.addEventListener("pointercancel", pointerUp);
window.addEventListener("resize", resizeCanvas);
document.getElementById("proposalButton").addEventListener("click",requestProposal);
resizeCanvas();
updateEstimates();
