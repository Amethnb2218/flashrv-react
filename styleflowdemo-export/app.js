const canvas = document.getElementById("demoCanvas");
const ctx = canvas.getContext("2d");

const playButton = document.getElementById("playButton");
const restartButton = document.getElementById("restartButton");
const exportButton = document.getElementById("exportButton");
const statusText = document.getElementById("statusText");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const FPS = 30;

const scenes = [
  {
    type: "intro",
    duration: 2.4,
    title: "Jolof'Era",
    subtitle: "Reservez. Brillez.",
    detail: "Reservation salon, shopping boutique et gestion pro dans une seule experience."
  },
  {
    type: "feature",
    duration: 2.5,
    title: "Decouvrez les meilleures adresses",
    subtitle: "Salons en vedette et boutiques coup de coeur",
    kicker: "Explorer",
    image: "home.jpeg",
    accent: "Une vitrine premium qui donne envie de reserver des la premiere seconde."
  },
  {
    type: "feature",
    duration: 2.3,
    title: "Choisissez votre salon",
    subtitle: "Fiche detaillee, services visibles et CTA immediat",
    kicker: "Salon",
    image: "salon-detail.jpeg",
    accent: "Navigation claire, visuels rassurants, prise de rendez-vous simplifiee."
  },
  {
    type: "split",
    duration: 2.4,
    title: "Ouvrez un service",
    subtitle: "Prix, duree, acompte et reservation en un regard",
    kicker: "Service",
    image: "service-modal.jpeg",
    secondaryImage: "booking-summary.jpeg",
    accent: "Le parcours reste fluide jusque dans la confirmation."
  },
  {
    type: "feature",
    duration: 2.3,
    title: "Confirmez votre reservation",
    subtitle: "Recapitulatif net, rassurant et instantanement comprehensible",
    kicker: "Booking",
    image: "booking-summary.jpeg",
    accent: "Tout ce qu'il faut pour inspirer confiance avant le rendez-vous."
  },
  {
    type: "feature",
    duration: 2.5,
    title: "Commandez en boutique",
    subtitle: "Collection, prix, stock et panier directement depuis mobile",
    kicker: "Boutique",
    image: "boutique-detail.jpeg",
    accent: "Une experience e-commerce elegante, locale et rapide."
  },
  {
    type: "feature",
    duration: 2.1,
    title: "Validez la commande",
    subtitle: "Confirmation visuelle forte et ticket lisible",
    kicker: "Checkout",
    image: "order-success.jpeg",
    accent: "Un final propre qui augmente la satisfaction apres achat."
  },
  {
    type: "split",
    duration: 2.6,
    title: "Pilotez votre boutique",
    subtitle: "Articles, revenus, commandes et statuts au meme endroit",
    kicker: "Dashboard",
    image: "dashboard-articles.jpeg",
    secondaryImage: "dashboard-orders.jpeg",
    accent: "Des ecrans utiles pour vendre, suivre et agir plus vite."
  },
  {
    type: "feature",
    duration: 2.4,
    title: "Activez votre espace pro",
    subtitle: "Salon ou boutique, l'inscription guide l'utilisateur clairement",
    kicker: "Onboarding",
    image: "onboarding.jpeg",
    accent: "Une entree simple pour accelerer l'adoption de la plateforme."
  },
  {
    type: "outro",
    duration: 3,
    title: "Jolof'Era",
    subtitle: "La plateforme beaute & lifestyle qui connecte reservation, commerce et gestion.",
    detail: "Faites briller votre marque. Faites vivre l'experience."
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

const qs = new URLSearchParams(window.location.search);

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
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

function line(ctx, x1, y1, x2, y2, strokeStyle, width = 1) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.restore();
}

function drawBackdrop(time) {
  const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  bg.addColorStop(0, "#0b0a09");
  bg.addColorStop(0.55, "#16120d");
  bg.addColorStop(1, "#040404");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const orb1x = WIDTH * (0.18 + Math.sin(time * 0.35) * 0.06);
  const orb1y = HEIGHT * (0.2 + Math.cos(time * 0.2) * 0.03);
  const orb2x = WIDTH * (0.86 + Math.cos(time * 0.27) * 0.05);
  const orb2y = HEIGHT * (0.78 + Math.sin(time * 0.31) * 0.04);

  const glow1 = ctx.createRadialGradient(orb1x, orb1y, 0, orb1x, orb1y, 360);
  glow1.addColorStop(0, "rgba(229, 182, 65, 0.30)");
  glow1.addColorStop(1, "rgba(229, 182, 65, 0)");
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const glow2 = ctx.createRadialGradient(orb2x, orb2y, 0, orb2x, orb2y, 420);
  glow2.addColorStop(0, "rgba(255, 255, 255, 0.12)");
  glow2.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.save();
  ctx.globalAlpha = 0.12;
  for (let x = -120; x < WIDTH + 120; x += 90) {
    const offset = (time * 60) % 90;
    line(ctx, x + offset, 0, x - 180 + offset, HEIGHT, "rgba(255,255,255,0.08)");
  }
  ctx.restore();

  for (let i = 0; i < 28; i++) {
    const px = ((i * 211) % WIDTH) + Math.sin(time * 0.7 + i) * 22;
    const py = ((i * 401) % HEIGHT) + Math.cos(time * 0.55 + i * 0.7) * 30;
    const size = 2 + (i % 4);
    ctx.save();
    ctx.globalAlpha = 0.15 + ((Math.sin(time * 1.3 + i) + 1) / 2) * 0.2;
    ctx.fillStyle = i % 3 === 0 ? "#e5b641" : "#ffffff";
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawLabelPill(text, x, y, width) {
  fillRoundedRect(x, y, width, 54, 27, "rgba(255, 243, 215, 0.92)");
  ctx.fillStyle = "#141311";
  ctx.font = "700 24px 'Segoe UI Variable Display', sans-serif";
  ctx.fillText(text, x + 22, y + 35);
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

function drawPhone(image, options = {}) {
  const {
    x = 210,
    y = 250,
    width = 660,
    height = 1340,
    progress = 1,
    rotation = 0,
    glass = true
  } = options;

  const eased = easeOutExpo(clamp(progress));
  const scale = lerp(0.92, 1, eased);
  const alpha = eased;

  ctx.save();
  ctx.translate(x + width / 2, y + height / 2 + lerp(40, 0, eased));
  ctx.rotate(rotation);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;

  ctx.shadowColor = "rgba(0, 0, 0, 0.38)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 26;
  fillRoundedRect(-width / 2, -height / 2, width, height, 62, "#101010");

  ctx.shadowColor = "transparent";
  fillRoundedRect(-width / 2 + 12, -height / 2 + 12, width - 24, height - 24, 54, "#050505");

  ctx.save();
  drawRoundedRect(-width / 2 + 24, -height / 2 + 24, width - 48, height - 48, 46);
  ctx.clip();
  ctx.drawImage(image, -width / 2 + 24, -height / 2 + 24, width - 48, height - 48);
  if (glass) {
    const gloss = ctx.createLinearGradient(-width / 2, -height / 2, width / 2, height / 2);
    gloss.addColorStop(0, "rgba(255,255,255,0.18)");
    gloss.addColorStop(0.26, "rgba(255,255,255,0.03)");
    gloss.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gloss;
    ctx.fillRect(-width / 2 + 24, -height / 2 + 24, width - 48, height - 48);
  }
  const cinematic = ctx.createLinearGradient(0, -height / 2, 0, height / 2);
  cinematic.addColorStop(0, "rgba(0,0,0,0.02)");
  cinematic.addColorStop(0.58, "rgba(0,0,0,0)");
  cinematic.addColorStop(1, "rgba(0,0,0,0.22)");
  ctx.fillStyle = cinematic;
  ctx.fillRect(-width / 2 + 24, -height / 2 + 24, width - 48, height - 48);
  ctx.restore();

  fillRoundedRect(-95, -height / 2 + 54, 190, 20, 10, "rgba(15,15,15,0.95)");
  ctx.restore();
}

function drawTextBlock(scene, progress, time) {
  const fade = easeInOutCubic(clamp(progress));
  const x = 96;
  const y = 214;

  ctx.save();
  ctx.globalAlpha = fade;
  ctx.translate(lerp(-28, 0, fade), 0);

  ctx.fillStyle = "rgba(229, 182, 65, 0.92)";
  ctx.font = "700 24px 'Segoe UI Variable Display', sans-serif";
  ctx.fillText(scene.kicker || "Jolof'Era", x, y);

  ctx.fillStyle = "#f8f1df";
  ctx.font = "700 64px 'Segoe UI Variable Display', sans-serif";
  const titleLines = getWrappedLines(scene.title, 560);
  wrapText(scene.title, x, y + 62, 560, 74);
  const titleBottom = y + 62 + (titleLines.length - 1) * 74;

  ctx.fillStyle = "rgba(250, 243, 230, 0.92)";
  ctx.font = "600 31px 'Segoe UI Variable Display', sans-serif";
  const subtitleStartY = titleBottom + 74;
  const subtitleLines = getWrappedLines(scene.subtitle, 560);
  wrapText(scene.subtitle, x, subtitleStartY, 560, 40);
  const subtitleBottom = subtitleStartY + (subtitleLines.length - 1) * 40;

  const accentY = subtitleBottom + 58;
  fillRoundedRect(x, accentY, 420, 112, 28, "rgba(17,17,17,0.52)");
  strokeRoundedRect(x, accentY, 420, 112, 28, "rgba(255,255,255,0.16)");
  ctx.fillStyle = "#fff5db";
  ctx.font = "600 27px 'Segoe UI Variable Display', sans-serif";
  wrapText(scene.accent, x + 24, accentY + 40, 370, 32);

  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.08 + Math.sin(time * 0.8) * 0.03;
  ctx.strokeStyle = "#e5b641";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(860, 300, 88, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(900, 336, 132, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawSplitScene(scene, localTime, progress) {
  drawTextBlock(scene, progress, localTime);

  const offset = Math.sin(localTime * 1.2) * 8;
  drawPhone(assets[scene.image], {
    x: 184,
    y: 780 + offset,
    width: 432,
    height: 880,
    progress,
    rotation: -0.07
  });

  drawPhone(assets[scene.secondaryImage], {
    x: 586,
    y: 954 - offset * 0.6,
    width: 344,
    height: 700,
    progress: clamp((progress - 0.1) / 0.9),
    rotation: 0.08
  });
}

function drawFeatureScene(scene, localTime, progress) {
  drawTextBlock(scene, progress, localTime);
  const floatY = Math.sin(localTime * 1.7) * 12;
  drawPhone(assets[scene.image], {
    x: 374,
    y: 742 + floatY,
    width: 454,
    height: 924,
    progress,
    rotation: -0.035
  });

  const chipProgress = easeOutExpo(clamp((progress - 0.15) / 0.85));
  ctx.save();
  ctx.globalAlpha = chipProgress;
  ctx.translate(lerp(80, 0, chipProgress), 0);
  drawLabelPill("Mobile first", 690, 1030, 220);
  drawLabelPill("UX premium", 640, 1112, 200);
  drawLabelPill("Conversion", 708, 1194, 190);
  ctx.restore();
}

function drawIntro(scene, localTime, progress) {
  const p = easeInOutCubic(progress);
  ctx.save();
  ctx.translate(WIDTH / 2, HEIGHT / 2 - 80);
  ctx.scale(lerp(0.86, 1, p), lerp(0.86, 1, p));
  ctx.rotate(Math.sin(localTime * 0.8) * 0.02);

  ctx.shadowBlur = 60;
  ctx.shadowColor = "rgba(229, 182, 65, 0.35)";
  fillRoundedRect(-152, -152, 304, 304, 64, "#161616");
  ctx.shadowColor = "transparent";
  strokeRoundedRect(-152, -152, 304, 304, 64, "rgba(255,255,255,0.10)", 2);

  ctx.fillStyle = "#f7f3e6";
  ctx.font = "900 190px 'Segoe UI Variable Display', sans-serif";
  ctx.fillText("F", -44, 68);

  ctx.fillStyle = "#e5b641";
  ctx.font = "900 92px 'Segoe UI Variable Display', sans-serif";
  ctx.fillText("/", 28, -10);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = p;
  ctx.fillStyle = "#f8f1df";
  ctx.textAlign = "center";
  ctx.font = "700 108px 'Segoe UI Variable Display', sans-serif";
  ctx.fillText(scene.title, WIDTH / 2, 1160);

  ctx.fillStyle = "#e5b641";
  ctx.font = "700 42px 'Segoe UI Variable Display', sans-serif";
  ctx.fillText(scene.subtitle.toUpperCase(), WIDTH / 2, 1234);

  ctx.fillStyle = "rgba(247, 241, 223, 0.76)";
  ctx.font = "500 32px 'Segoe UI Variable Display', sans-serif";
  wrapTextCentered(scene.detail, WIDTH / 2, 1320, 760, 44);
  ctx.restore();
}

function drawOutro(scene, localTime, progress) {
  const p = easeInOutCubic(progress);

  ctx.save();
  ctx.globalAlpha = 0.95;
  const band = ctx.createLinearGradient(0, 320, WIDTH, 1500);
  band.addColorStop(0, "rgba(229,182,65,0.00)");
  band.addColorStop(0.5, "rgba(229,182,65,0.24)");
  band.addColorStop(1, "rgba(255,255,255,0.00)");
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = p;
  ctx.translate(0, lerp(36, 0, p));
  ctx.textAlign = "center";

  ctx.fillStyle = "rgba(229, 182, 65, 0.92)";
  ctx.font = "700 34px 'Segoe UI Variable Display', sans-serif";
  ctx.fillText("DEMO PUBLICITAIRE", WIDTH / 2, 600);

  ctx.fillStyle = "#f8f1df";
  ctx.font = "700 116px 'Segoe UI Variable Display', sans-serif";
  ctx.fillText(scene.title, WIDTH / 2, 760);

  fillRoundedRect(188, 870, 704, 250, 42, "rgba(255,255,255,0.08)");
  strokeRoundedRect(188, 870, 704, 250, 42, "rgba(255,255,255,0.12)");

  ctx.fillStyle = "#fff6de";
  ctx.font = "600 42px 'Segoe UI Variable Display', sans-serif";
  wrapTextCentered(scene.subtitle, WIDTH / 2, 955, 620, 54);

  ctx.fillStyle = "rgba(247, 241, 223, 0.72)";
  ctx.font = "500 30px 'Segoe UI Variable Display', sans-serif";
  wrapTextCentered(scene.detail, WIDTH / 2, 1165, 680, 40);

  drawLabelPill("jolofera.com", 370, 1354 + Math.sin(localTime * 2.2) * 6, 340);
  ctx.restore();
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

function renderScene(scene, sceneTime) {
  const progress = clamp(sceneTime / scene.duration);

  if (scene.type === "intro") {
    drawIntro(scene, sceneTime, progress);
    return;
  }

  if (scene.type === "outro") {
    drawOutro(scene, sceneTime, progress);
    return;
  }

  if (scene.type === "split") {
    drawSplitScene(scene, sceneTime, progress);
    return;
  }

  drawFeatureScene(scene, sceneTime, progress);
}

function drawGlobalBrand(time) {
  ctx.save();
  ctx.globalAlpha = 0.98;
  fillRoundedRect(66, 62, 948, 116, 36, "rgba(10,10,10,0.55)");
  strokeRoundedRect(66, 62, 948, 116, 36, "rgba(255,255,255,0.14)");

  fillRoundedRect(90, 82, 70, 70, 20, "#161616");
  ctx.fillStyle = "#f5f2eb";
  ctx.font = "900 46px 'Segoe UI Variable Display', sans-serif";
  ctx.fillText("F", 111, 131);
  ctx.fillStyle = "#e5b641";
  ctx.font = "900 28px 'Segoe UI Variable Display', sans-serif";
  ctx.fillText("/", 137, 109);

  ctx.fillStyle = "#f8f1df";
  ctx.font = "800 38px 'Segoe UI Variable Display', sans-serif";
  ctx.fillText("Style", 182, 124);
  ctx.fillStyle = "#e5b641";
  ctx.fillText("Flow", 286, 124);

  ctx.fillStyle = "rgba(247, 241, 223, 0.84)";
  ctx.font = "700 18px 'Segoe UI Variable Display', sans-serif";
  ctx.fillText("RESERVEZ. BRILLEZ.", 184, 151);

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.80)";
  ctx.font = "600 22px 'Segoe UI Variable Display', sans-serif";
  ctx.fillText(`${Math.floor(playhead)}s`, 968, 127);
  ctx.textAlign = "left";
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.7;
  line(ctx, 80, 178, 1000, 178, "rgba(255,255,255,0.08)", 2);
  fillRoundedRect(80, 172, (920 * playhead) / totalDuration, 12, 6, "#e5b641");
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.08 + Math.sin(time) * 0.02;
  ctx.strokeStyle = "rgba(229,182,65,0.8)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(900, 134, 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function renderFrame(timeInSeconds) {
  drawBackdrop(timeInSeconds);

  for (let i = 0; i < scenes.length; i++) {
    const start = sceneOffsets[i];
    const end = start + scenes[i].duration;
    if (timeInSeconds >= start && timeInSeconds <= end) {
      renderScene(scenes[i], timeInSeconds - start);
      break;
    }
  }

  drawGlobalBrand(timeInSeconds);
}

function frame(timestamp) {
  if (!lastTimestamp) {
    lastTimestamp = timestamp;
  }

  const delta = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;

  if (isPlaying) {
    playhead += delta;
    if (playhead >= totalDuration) {
      playhead = totalDuration;
      isPlaying = false;
      playButton.textContent = "Lire";
      if (!recording) {
        statusText.textContent = "Apercu termine. Tu peux rejouer ou exporter la video.";
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
    ? "Apercu en lecture. Clique sur \"Exporter en WebM\" pour generer la video."
    : "Lecture remise au debut.";
  renderFrame(playhead);
}

async function exportVideo() {
  if (recording) {
    return;
  }

  recording = true;
  exportButton.disabled = true;
  playButton.disabled = true;
  restartButton.disabled = true;
  statusText.textContent = "Export en cours... laisse l'onglet ouvert jusqu'au telechargement.";

  try {
    const blob = await renderVideoBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "jolofera-demo-promo.webm";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    statusText.textContent = "Export termine. Le fichier jolofera-demo-promo.webm vient d'etre telecharge.";
  } catch (error) {
    statusText.textContent = `Erreur export: ${error.message}`;
  } finally {
    recording = false;
    exportButton.disabled = false;
    playButton.disabled = false;
    restartButton.disabled = false;
  }
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
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 });
    const chunks = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
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

async function init() {
  const loadedImages = await Promise.all(imageNames.map((name) => preloadImage(name)));
  imageNames.forEach((name, index) => {
    assets[name] = loadedImages[index];
  });

  renderFrame(0);
  requestAnimationFrame(frame);

  playButton.addEventListener("click", () => {
    isPlaying = !isPlaying;
    playButton.textContent = isPlaying ? "Pause" : "Lire";
    statusText.textContent = isPlaying ? "Apercu en lecture." : "Apercu en pause.";
  });

  restartButton.addEventListener("click", () => resetPlayback(true));
  exportButton.addEventListener("click", exportVideo);

  if (qs.get("autorender") === "1") {
    setTimeout(() => {
      exportVideo().catch((error) => {
        statusText.textContent = `Erreur export: ${error.message}`;
      });
    }, 1200);
  }

  window.renderPromoBase64 = async () => {
    const blob = await renderVideoBlob();
    return blobToDataUrl(blob);
  };
}

init().catch((error) => {
  console.error(error);
  statusText.textContent = `Impossible de charger les assets: ${error.message}`;
});
