const canvas = document.getElementById("demoCanvas");
const ctx = canvas.getContext("2d");

const playButton = document.getElementById("playButton");
const restartButton = document.getElementById("restartButton");
const exportButton = document.getElementById("exportButton");
const statusText = document.getElementById("statusText");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const FPS = 30;
const BRAND_LOGO_PATH = "../public/brand/logo-full.png";

const scenes = [
  {
    type: "intro",
    duration: 1.9,
    title: "Jolof'Era",
    subtitle: "La beaute prend le pouvoir.",
    detail: "Une plateforme mobile qui transforme la reservation, le shopping et la gestion pro en experience desir."
  },
  {
    type: "feature",
    duration: 1.85,
    kicker: "SIGNATURE",
    title: "Une presence qui se remarque.",
    subtitle: "Salons, boutiques, visuels, promesse de marque. Tout respire le premium.",
    image: "home.jpeg",
    accent: "Plus qu'une interface: une allure."
  },
  {
    type: "feature",
    duration: 1.75,
    kicker: "RESERVER",
    title: "Choisir. Cliquer. Bloquer son rendez-vous.",
    subtitle: "Le service est clair, le desir est immediat, l'action est simple.",
    image: "salon-detail.jpeg",
    accent: "Moins d'hesitation. Plus de conversion."
  },
  {
    type: "split",
    duration: 1.9,
    kicker: "PRECISION",
    title: "Chaque detail donne confiance.",
    subtitle: "Prix, duree, acompte, recapitulatif. Rien n'est flou.",
    image: "service-modal.jpeg",
    secondaryImage: "booking-summary.jpeg",
    accent: "Un tunnel net, elegant, rassurant."
  },
  {
    type: "feature",
    duration: 1.8,
    kicker: "COMMERCE",
    title: "La boutique vend sans friction.",
    subtitle: "Collection visible, stock compris, achat mobile instantane.",
    image: "boutique-detail.jpeg",
    accent: "Une vitrine qui convertit."
  },
  {
    type: "feature",
    duration: 1.55,
    kicker: "PREUVE",
    title: "Le client repart avec certitude.",
    subtitle: "Confirmation forte. Ticket lisible. Satisfaction immediate.",
    image: "order-success.jpeg",
    accent: "Le bon final fait la bonne impression."
  },
  {
    type: "split",
    duration: 1.9,
    kicker: "CONTROL",
    title: "L'espace pro garde le tempo.",
    subtitle: "Articles, commandes, revenus. Tout est pilote au meme endroit.",
    image: "dashboard-articles.jpeg",
    secondaryImage: "dashboard-orders.jpeg",
    accent: "Une marque qui vend doit aussi savoir gerer."
  },
  {
    type: "feature",
    duration: 1.7,
    kicker: "LANCEMENT",
    title: "Entrez. Choisissez. Demarrez.",
    subtitle: "Salon ou boutique, l'onboarding guide l'ambition.",
    image: "onboarding.jpeg",
    accent: "Une plateforme faite pour grandir vite."
  },
  {
    type: "outro",
    duration: 2.6,
    title: "Jolof'Era",
    subtitle: "Reserve. Achete. Rayonne.",
    detail: "La version luxe du digital beaute au Senegal."
  }
];

const sceneOffsets = [];
let totalDuration = 0;
for (const scene of scenes) {
  sceneOffsets.push(totalDuration);
  totalDuration += scene.duration;
}

const imageNames = [
  "home.jpeg",
  "salon-detail.jpeg",
  "service-modal.jpeg",
  "booking-summary.jpeg",
  "boutique-detail.jpeg",
  "order-success.jpeg",
  "dashboard-articles.jpeg",
  "dashboard-orders.jpeg",
  "onboarding.jpeg"
];

const assets = {};
let isPlaying = true;
let playhead = 0;
let lastTimestamp = 0;
let recording = false;

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeInOutQuart(t) {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

function easeOutExpo(t) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function drawRoundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function fillRoundedRect(x, y, width, height, radius, fillStyle) {
  ctx.save();
  drawRoundedRect(x, y, width, height, radius);
  ctx.fillStyle = fillStyle;
  ctx.fill();
  ctx.restore();
}

function strokeRoundedRect(x, y, width, height, radius, strokeStyle, lineWidth = 2) {
  ctx.save();
  drawRoundedRect(x, y, width, height, radius);
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
  ctx.restore();
}

function preloadImage(name) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `./assets/${name}`;
  });
}

function preloadStaticImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Impossible de charger ${src}`));
    img.src = src;
  });
}

function drawBrandLogo(x, y, maxWidth, maxHeight, alpha = 1) {
  const logo = assets.__brandLogo;
  if (!logo?.width || !logo?.height) {
    return 0;
  }
  const scale = Math.min(maxWidth / logo.width, maxHeight / logo.height);
  const width = logo.width * scale;
  const height = logo.height * scale;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(logo, x, y + (maxHeight - height) / 2, width, height);
  ctx.restore();
  return width;
}

function getWrappedLines(text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let lineText = "";
  for (const word of words) {
    const test = lineText ? `${lineText} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && lineText) {
      lines.push(lineText);
      lineText = word;
    } else {
      lineText = test;
    }
  }
  if (lineText) {
    lines.push(lineText);
  }
  return lines;
}

function wrapText(text, x, startY, maxWidth, lineHeight) {
  const words = text.split(" ");
  let lineText = "";
  let y = startY;
  for (const word of words) {
    const test = lineText ? `${lineText} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && lineText) {
      ctx.fillText(lineText, x, y);
      lineText = word;
      y += lineHeight;
    } else {
      lineText = test;
    }
  }
  if (lineText) {
    ctx.fillText(lineText, x, y);
  }
}

function wrapTextCentered(text, centerX, startY, maxWidth, lineHeight) {
  const words = text.split(" ");
  let lineText = "";
  let y = startY;
  for (const word of words) {
    const test = lineText ? `${lineText} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && lineText) {
      ctx.fillText(lineText, centerX, y);
      lineText = word;
      y += lineHeight;
    } else {
      lineText = test;
    }
  }
  if (lineText) {
    ctx.fillText(lineText, centerX, y);
  }
}

function drawBackdrop(time) {
  const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  bg.addColorStop(0, "#0b0907");
  bg.addColorStop(0.45, "#140f0b");
  bg.addColorStop(1, "#050507");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const glowA = ctx.createRadialGradient(220, 300, 0, 220, 300, 500);
  glowA.addColorStop(0, "rgba(240,190,86,0.34)");
  glowA.addColorStop(1, "rgba(240,190,86,0)");
  ctx.fillStyle = glowA;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const px = WIDTH * (0.76 + Math.sin(time * 0.9) * 0.04);
  const py = HEIGHT * (0.78 + Math.cos(time * 0.8) * 0.03);
  const glowB = ctx.createRadialGradient(px, py, 0, px, py, 420);
  glowB.addColorStop(0, "rgba(184,101,79,0.22)");
  glowB.addColorStop(1, "rgba(184,101,79,0)");
  ctx.fillStyle = glowB;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.save();
  ctx.globalAlpha = 0.11;
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  for (let i = -HEIGHT; i < WIDTH; i += 80) {
    ctx.beginPath();
    ctx.moveTo(i + (time * 90) % 80, 0);
    ctx.lineTo(i - 240 + (time * 90) % 80, HEIGHT);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTopBrand(time) {
  fillRoundedRect(58, 56, 964, 118, 38, "rgba(10,10,10,0.56)");
  strokeRoundedRect(58, 56, 964, 118, 38, "rgba(255,255,255,0.12)");

  fillRoundedRect(80, 72, 380, 86, 28, "rgba(255,248,236,0.96)");
  strokeRoundedRect(80, 72, 380, 86, 28, "rgba(240,190,86,0.18)", 1.5);
  drawBrandLogo(94, 79, 348, 72, 1);

  ctx.fillStyle = "rgba(247,240,228,0.82)";
  ctx.font = "700 17px 'Segoe UI Variable Text', sans-serif";
  ctx.fillText("LUXE CUT", 486, 123);

  const barWidth = 220;
  fillRoundedRect(758, 106, barWidth, 8, 4, "rgba(255,255,255,0.12)");
  fillRoundedRect(758, 106, barWidth * (playhead / totalDuration), 8, 4, "#f0be56");

  ctx.fillStyle = "rgba(247,240,228,0.68)";
  ctx.font = "600 18px 'Segoe UI Variable Text', sans-serif";
  ctx.fillText("0" + Math.floor(playhead), 758, 98);

  ctx.save();
  ctx.globalAlpha = 0.18 + Math.sin(time * 1.3) * 0.03;
  ctx.strokeStyle = "#f0be56";
  ctx.beginPath();
  ctx.arc(972, 112, 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawPhone(image, options = {}) {
  const {
    x = 230,
    y = 320,
    width = 620,
    height = 1260,
    rotation = 0,
    progress = 1,
    borderGlow = "rgba(240,190,86,0.18)"
  } = options;

  const eased = easeOutExpo(clamp(progress));
  const scale = lerp(0.88, 1, eased);

  ctx.save();
  ctx.translate(x + width / 2, y + height / 2 + lerp(60, 0, eased));
  ctx.rotate(rotation);
  ctx.scale(scale, scale);
  ctx.globalAlpha = eased;

  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 56;
  ctx.shadowOffsetY = 28;
  fillRoundedRect(-width / 2, -height / 2, width, height, 64, "#0d0d10");
  ctx.shadowColor = "transparent";

  strokeRoundedRect(-width / 2, -height / 2, width, height, 64, borderGlow, 3);
  fillRoundedRect(-width / 2 + 16, -height / 2 + 16, width - 32, height - 32, 52, "#030304");

  ctx.save();
  drawRoundedRect(-width / 2 + 28, -height / 2 + 28, width - 56, height - 56, 44);
  ctx.clip();
  ctx.drawImage(image, -width / 2 + 28, -height / 2 + 28, width - 56, height - 56);

  const sheen = ctx.createLinearGradient(-width / 2, -height / 2, width / 2, height / 2);
  sheen.addColorStop(0, "rgba(255,255,255,0.18)");
  sheen.addColorStop(0.22, "rgba(255,255,255,0.04)");
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(-width / 2 + 28, -height / 2 + 28, width - 56, height - 56);
  const cinematic = ctx.createLinearGradient(0, -height / 2, 0, height / 2);
  cinematic.addColorStop(0, "rgba(0,0,0,0.02)");
  cinematic.addColorStop(0.56, "rgba(0,0,0,0)");
  cinematic.addColorStop(1, "rgba(0,0,0,0.26)");
  ctx.fillStyle = cinematic;
  ctx.fillRect(-width / 2 + 28, -height / 2 + 28, width - 56, height - 56);
  ctx.restore();

  fillRoundedRect(-92, -height / 2 + 54, 184, 18, 9, "rgba(15,15,18,0.94)");
  ctx.restore();
}

function drawLabel(text, x, y, width) {
  fillRoundedRect(x, y, width, 52, 26, "rgba(255,247,230,0.93)");
  ctx.fillStyle = "#18130d";
  ctx.font = "700 22px 'Segoe UI Variable Text', sans-serif";
  ctx.fillText(text, x + 18, y + 34);
}

function drawTextBlock(scene, progress) {
  const p = easeInOutQuart(clamp(progress));
  const x = 88;
  const y = 244;

  ctx.save();
  ctx.globalAlpha = p;
  ctx.translate(lerp(-50, 0, p), 0);

  ctx.fillStyle = "#f0be56";
  ctx.font = "700 22px 'Segoe UI Variable Text', sans-serif";
  ctx.fillText(scene.kicker || "Jolof'Era", x, y);

  ctx.fillStyle = "#f8f0e3";
  ctx.font = "700 72px Georgia, serif";
  const titleLines = getWrappedLines(scene.title, 620);
  wrapText(scene.title, x, y + 66, 620, 78);
  const titleBottom = y + 66 + (titleLines.length - 1) * 78;

  ctx.fillStyle = "rgba(251,245,236,0.94)";
  ctx.font = "600 29px 'Segoe UI Variable Text', sans-serif";
  const subtitleStartY = titleBottom + 70;
  const subtitleLines = getWrappedLines(scene.subtitle, 560);
  wrapText(scene.subtitle, x, subtitleStartY, 560, 38);
  const subtitleBottom = subtitleStartY + (subtitleLines.length - 1) * 38;

  const accentY = subtitleBottom + 52;
  fillRoundedRect(x, accentY, 392, 90, 28, "rgba(14,13,13,0.42)");
  strokeRoundedRect(x, accentY, 392, 90, 28, "rgba(240,190,86,0.22)");
  ctx.fillStyle = "#fff4dd";
  ctx.font = "600 23px 'Segoe UI Variable Text', sans-serif";
  wrapText(scene.accent || scene.detail, x + 20, accentY + 33, 348, 28);
  ctx.restore();
}

function drawFeatureScene(scene, localTime, progress) {
  drawTextBlock(scene, progress);
  const sway = Math.sin(localTime * 2.4) * 15;

  drawPhone(assets[scene.image], {
    x: 390,
    y: 784 + sway,
    width: 434,
    height: 888,
    rotation: -0.03,
    progress
  });

  const chip = easeOutExpo(clamp((progress - 0.18) / 0.82));
  ctx.save();
  ctx.globalAlpha = chip;
  ctx.translate(lerp(80, 0, chip), 0);
  drawLabel("Luxury UX", 674, 1048, 184);
  drawLabel("Mobile Desire", 612, 1122, 250);
  drawLabel("Fast Conversion", 668, 1196, 230);
  ctx.restore();
}

function drawSplitScene(scene, localTime, progress) {
  drawTextBlock(scene, progress);
  const offset = Math.sin(localTime * 2.8) * 10;

  drawPhone(assets[scene.image], {
    x: 170,
    y: 812 + offset,
    width: 416,
    height: 850,
    rotation: -0.072,
    progress
  });

  drawPhone(assets[scene.secondaryImage], {
    x: 598,
    y: 986 - offset,
    width: 336,
    height: 686,
    rotation: 0.085,
    progress: clamp((progress - 0.08) / 0.92),
    borderGlow: "rgba(255,255,255,0.18)"
  });
}

function drawIntro(scene, localTime, progress) {
  const p = easeInOutQuart(progress);
  ctx.save();
  ctx.translate(WIDTH / 2, HEIGHT / 2 - 180);
  ctx.scale(lerp(0.8, 1, p), lerp(0.8, 1, p));
  ctx.rotate(Math.sin(localTime * 2) * 0.02);
  ctx.shadowColor = "rgba(240,190,86,0.38)";
  ctx.shadowBlur = 80;
  fillRoundedRect(-188, -188, 376, 376, 82, "#131114");
  ctx.shadowColor = "transparent";
  strokeRoundedRect(-188, -188, 376, 376, 82, "rgba(240,190,86,0.22)", 3);

  ctx.fillStyle = "#f8f0e3";
  ctx.font = "900 220px Georgia, serif";
  ctx.fillText("F", -58, 76);
  ctx.fillStyle = "#f0be56";
  ctx.font = "900 96px Georgia, serif";
  ctx.fillText("/", 34, -10);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = p;
  ctx.textAlign = "center";
  ctx.fillStyle = "#f8f0e3";
  ctx.font = "700 118px Georgia, serif";
  ctx.fillText(scene.title, WIDTH / 2, 1120);
  ctx.fillStyle = "#f0be56";
  ctx.font = "700 40px 'Segoe UI Variable Text', sans-serif";
  ctx.fillText(scene.subtitle.toUpperCase(), WIDTH / 2, 1198);
  ctx.fillStyle = "rgba(248,240,227,0.72)";
  ctx.font = "500 30px 'Segoe UI Variable Text', sans-serif";
  wrapTextCentered(scene.detail, WIDTH / 2, 1288, 740, 40);
  ctx.restore();
}

function drawOutro(scene, localTime, progress) {
  const p = easeInOutQuart(progress);
  ctx.save();
  ctx.globalAlpha = p;
  ctx.textAlign = "center";

  const beam = ctx.createLinearGradient(140, 460, 980, 1480);
  beam.addColorStop(0, "rgba(240,190,86,0)");
  beam.addColorStop(0.5, "rgba(240,190,86,0.28)");
  beam.addColorStop(1, "rgba(240,190,86,0)");
  ctx.fillStyle = beam;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "#f0be56";
  ctx.font = "700 28px 'Segoe UI Variable Text', sans-serif";
  ctx.fillText("LUXURY MOBILE COMMERCE", WIDTH / 2, 558);

  ctx.fillStyle = "#f8f0e3";
  ctx.font = "700 126px Georgia, serif";
  ctx.fillText(scene.title, WIDTH / 2, 748);

  fillRoundedRect(158, 860, 764, 286, 46, "rgba(255,255,255,0.06)");
  strokeRoundedRect(158, 860, 764, 286, 46, "rgba(240,190,86,0.18)");

  ctx.fillStyle = "#fff4dd";
  ctx.font = "700 46px Georgia, serif";
  wrapTextCentered(scene.subtitle, WIDTH / 2, 970, 640, 54);

  ctx.fillStyle = "rgba(248,240,227,0.72)";
  ctx.font = "500 30px 'Segoe UI Variable Text', sans-serif";
  wrapTextCentered(scene.detail, WIDTH / 2, 1150, 670, 40);

  drawLabel("jolofera.com", 376, 1366 + Math.sin(localTime * 2.2) * 6, 326);
  ctx.restore();
}

function renderScene(scene, sceneTime) {
  const progress = clamp(sceneTime / scene.duration);
  if (scene.type === "intro") return drawIntro(scene, sceneTime, progress);
  if (scene.type === "outro") return drawOutro(scene, sceneTime, progress);
  if (scene.type === "split") return drawSplitScene(scene, sceneTime, progress);
  return drawFeatureScene(scene, sceneTime, progress);
}

function renderFrame(timeInSeconds) {
  drawBackdrop(timeInSeconds);
  drawTopBrand(timeInSeconds);
  for (let i = 0; i < scenes.length; i++) {
    const start = sceneOffsets[i];
    const end = start + scenes[i].duration;
    if (timeInSeconds >= start && timeInSeconds <= end) {
      renderScene(scenes[i], timeInSeconds - start);
      break;
    }
  }
}

function frame(timestamp) {
  if (!lastTimestamp) lastTimestamp = timestamp;
  const delta = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;

  if (isPlaying) {
    playhead += delta;
    if (playhead >= totalDuration) {
      playhead = totalDuration;
      isPlaying = false;
      playButton.textContent = "Lire";
      if (!recording) {
        statusText.textContent = "Apercu termine. Cette version luxe est prete a etre exportee.";
      }
    }
  }

  renderFrame(playhead);
  requestAnimationFrame(frame);
}

function resetPlayback(autoplay = true) {
  playhead = 0;
  lastTimestamp = 0;
  isPlaying = autoplay;
  playButton.textContent = autoplay ? "Pause" : "Lire";
  statusText.textContent = autoplay
    ? "Apercu en lecture. Cette version pousse plus fort le cote pub premium."
    : "Lecture remise au debut.";
  renderFrame(playhead);
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Impossible de convertir le blob en data URL."));
    reader.readAsDataURL(blob);
  });
}

function renderVideoBlob() {
  return new Promise((resolve, reject) => {
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    const stream = canvas.captureStream(FPS);
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 7_000_000 });
    const chunks = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = () => reject(new Error("L'enregistrement video a echoue."));
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));

    resetPlayback(true);
    renderFrame(0);
    recorder.start();
    setTimeout(() => {
      isPlaying = false;
      playhead = totalDuration;
      renderFrame(playhead);
      recorder.stop();
    }, Math.ceil(totalDuration * 1000) + 250);
  });
}

async function exportVideo() {
  if (recording) return;
  recording = true;
  exportButton.disabled = true;
  playButton.disabled = true;
  restartButton.disabled = true;
  statusText.textContent = "Export en cours... laisse la page ouverte jusqu'au telechargement.";

  try {
    const blob = await renderVideoBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "jolofera-luxe-cut.webm";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    statusText.textContent = "Export termine. Le fichier jolofera-luxe-cut.webm vient d'etre telecharge.";
  } catch (error) {
    statusText.textContent = `Erreur export: ${error.message}`;
  } finally {
    recording = false;
    exportButton.disabled = false;
    playButton.disabled = false;
    restartButton.disabled = false;
  }
}

async function init() {
  const [loadedImages, brandLogo] = await Promise.all([
    Promise.all(imageNames.map((name) => preloadImage(name))),
    preloadStaticImage(BRAND_LOGO_PATH).catch(() => null)
  ]);
  imageNames.forEach((name, index) => {
    assets[name] = loadedImages[index];
  });
  assets.__brandLogo = brandLogo;

  renderFrame(0);
  requestAnimationFrame(frame);

  playButton.addEventListener("click", () => {
    isPlaying = !isPlaying;
    playButton.textContent = isPlaying ? "Pause" : "Lire";
    statusText.textContent = isPlaying ? "Apercu en lecture." : "Apercu en pause.";
  });
  restartButton.addEventListener("click", () => resetPlayback(true));
  exportButton.addEventListener("click", exportVideo);

  window.renderPromoBase64 = async () => {
    const blob = await renderVideoBlob();
    return blobToDataUrl(blob);
  };
}

init().catch((error) => {
  console.error(error);
  statusText.textContent = `Impossible de charger les assets: ${error.message}`;
});
