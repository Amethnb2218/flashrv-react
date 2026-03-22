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
    duration: 2.5,
    kicker: "Manifesto",
    title: ["Jolof'Era", "mobile", "signature"],
    subtitle: "Une experience premium qui connecte reservation, commerce et performance.",
    detail: "Un langage visuel moderne, clair et memorisable."
  },
  {
    type: "single",
    duration: 2.1,
    kicker: "01 Decouvrir",
    title: ["Une entree", "qui pose", "le niveau"],
    subtitle: "Le premier contact rassure, structure l'offre et donne une vraie presence de marque.",
    detail: "Une home qui convertit avant meme le scroll.",
    image: "home.jpeg",
    accent: "#d3a043"
  },
  {
    type: "single",
    duration: 2.0,
    kicker: "02 Reserver",
    title: ["Choisir", "vite", "et bien"],
    subtitle: "Navigation claire, services lisibles, intention directe: le parcours se signe naturellement.",
    detail: "Le design retire les hesitations.",
    image: "salon-detail.jpeg",
    accent: "#b47c34"
  },
  {
    type: "duo",
    duration: 2.3,
    kicker: "03 Convaincre",
    title: ["Le detail", "fait", "convertir"],
    subtitle: "Prix, duree, acompte et recapitulatif travaillent ensemble pour instaurer la confiance.",
    detail: "Quand tout est net, la decision est simple.",
    image: "service-modal.jpeg",
    secondaryImage: "booking-summary.jpeg",
    accent: "#c58f33"
  },
  {
    type: "single",
    duration: 2.0,
    kicker: "04 Vendre",
    title: ["Boutique", "premium", "mobile"],
    subtitle: "Un cadre soyeux met les produits en valeur et renforce la desirabilite.",
    detail: "Le commerce parait plus haut de gamme.",
    image: "boutique-detail.jpeg",
    accent: "#d6a65a"
  },
  {
    type: "single",
    duration: 1.8,
    kicker: "05 Finaliser",
    title: ["Confirmer", "avec", "elegance"],
    subtitle: "La confirmation d'achat reste claire, forte et cohérente avec la promesse premium.",
    detail: "Une fin propre augmente la satisfaction.",
    image: "order-success.jpeg",
    accent: "#be8740"
  },
  {
    type: "duo",
    duration: 2.2,
    kicker: "06 Piloter",
    title: ["Le back", "reste", "premium"],
    subtitle: "Articles, commandes et revenus: la gestion est rapide, lisible et orientee action.",
    detail: "L'outil pro tient le meme standing que la vitrine.",
    image: "dashboard-articles.jpeg",
    secondaryImage: "dashboard-orders.jpeg",
    accent: "#a16f2f"
  },
  {
    type: "single",
    duration: 1.9,
    kicker: "07 Lancer",
    title: ["Onboarding", "sans", "friction"],
    subtitle: "Salon ou boutique, l'entree dans l'ecosysteme reste naturelle et rassurante.",
    detail: "Un demarrage net, sans surcharge.",
    image: "onboarding.jpeg",
    accent: "#c79849"
  },
  {
    type: "outro",
    duration: 2.9,
    kicker: "Final",
    title: ["Jolof'Era", "Reservez", "Achetez"],
    subtitle: "Rayonnez avec une experience mobile digne des meilleures marques.",
    detail: "Signature Film V2. Plus cinema. Plus impact."
  }
];

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
const sceneOffsets = [];
let totalDuration = 0;
for (const scene of scenes) {
  sceneOffsets.push(totalDuration);
  totalDuration += scene.duration;
}

let playhead = 0;
let lastTimestamp = 0;
let isPlaying = true;
let recording = false;
const dustParticles = Array.from({ length: 26 }, (_, i) => ({
  seed: i + 1,
  x: ((i * 67) % WIDTH) / WIDTH,
  y: ((i * 113) % HEIGHT) / HEIGHT,
  size: 0.7 + (i % 5) * 0.35,
  speed: 0.16 + (i % 6) * 0.06
}));

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOutExpo(t) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
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

function getWrappedLines(text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }

  if (current) {
    lines.push(current);
  }
  return lines;
}

function drawLineReveal(text, x, y, maxWidth, revealProgress, clipHeight = 72, topOffset = 54) {
  const p = clamp(revealProgress);
  if (p <= 0) return;
  const revealWidth = Math.max(1, maxWidth * p);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - 2, y - topOffset, revealWidth + 8, clipHeight);
  ctx.clip();
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawWrappedText(text, x, y, maxWidth, lineHeight) {
  const lines = getWrappedLines(text, maxWidth);
  lines.forEach((line, i) => ctx.fillText(line, x, y + i * lineHeight));
}

function drawWrappedTextCentered(text, centerX, y, maxWidth, lineHeight) {
  const lines = getWrappedLines(text, maxWidth);
  lines.forEach((line, i) => ctx.fillText(line, centerX, y + i * lineHeight));
}

function drawBackground(time) {
  const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  bg.addColorStop(0, "#fffaf2");
  bg.addColorStop(0.48, "#f5e7d1");
  bg.addColorStop(1, "#efdcb9");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const glowA = ctx.createRadialGradient(150, 200, 0, 150, 200, 460);
  glowA.addColorStop(0, "rgba(200,150,45,0.16)");
  glowA.addColorStop(1, "rgba(200,150,45,0)");
  ctx.fillStyle = glowA;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const gx = 840 + Math.sin(time * 0.6) * 38;
  const gy = 220 + Math.cos(time * 0.5) * 24;
  const glowB = ctx.createRadialGradient(gx, gy, 0, gx, gy, 360);
  glowB.addColorStop(0, "rgba(255,255,255,0.60)");
  glowB.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glowB;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.strokeStyle = "rgba(110,80,35,0.20)";
  for (let i = -HEIGHT; i < WIDTH + 240; i += 104) {
    const offset = (time * 42) % 104;
    ctx.beginPath();
    ctx.moveTo(i + offset, 0);
    ctx.lineTo(i - 280 + offset, HEIGHT);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSweepBands(time) {
  const sweepA = ctx.createLinearGradient(0, 220, WIDTH, 980);
  sweepA.addColorStop(0, "rgba(255,255,255,0)");
  sweepA.addColorStop(0.42, "rgba(217,165,78,0.10)");
  sweepA.addColorStop(1, "rgba(255,255,255,0)");
  ctx.save();
  ctx.globalAlpha = 0.54;
  ctx.translate(Math.sin(time * 0.55) * 44, Math.cos(time * 0.4) * 24);
  ctx.rotate(-0.2 + Math.sin(time * 0.24) * 0.05);
  fillRoundedRect(-240, 420, WIDTH + 420, 360, 180, sweepA);
  ctx.restore();

  const sweepB = ctx.createLinearGradient(0, 1200, WIDTH, 1760);
  sweepB.addColorStop(0, "rgba(255,255,255,0)");
  sweepB.addColorStop(0.5, "rgba(255,255,255,0.26)");
  sweepB.addColorStop(1, "rgba(255,255,255,0)");
  ctx.save();
  ctx.globalAlpha = 0.36;
  ctx.translate(Math.sin(time * 0.9) * 28, -Math.cos(time * 0.7) * 30);
  ctx.rotate(0.16);
  fillRoundedRect(-200, 1180, WIDTH + 340, 280, 140, sweepB);
  ctx.restore();

  ctx.save();
  dustParticles.forEach((particle) => {
    const px = (particle.x * WIDTH + Math.sin(time * particle.speed + particle.seed) * 32 + WIDTH) % WIDTH;
    const py = (particle.y * HEIGHT + (time * 18 * particle.speed) + Math.cos(time * particle.speed * 0.7 + particle.seed) * 12) % HEIGHT;
    const alpha = 0.08 + Math.sin(time * particle.speed + particle.seed) * 0.05;
    ctx.fillStyle = `rgba(198,150,58,${Math.max(0.03, alpha).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(px, py, particle.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawTopBar(sceneIndex, time) {
  fillRoundedRect(52, 44, 976, 128, 40, "rgba(255,255,255,0.78)");
  strokeRoundedRect(52, 44, 976, 128, 40, "rgba(102,74,31,0.14)");

  fillRoundedRect(84, 74, 84, 84, 24, "#141414");
  ctx.fillStyle = "#f8f0df";
  ctx.font = "900 54px 'Palatino Linotype', Georgia, serif";
  ctx.fillText("F", 104, 136);
  ctx.fillStyle = "#c8962d";
  ctx.font = "900 32px 'Palatino Linotype', Georgia, serif";
  ctx.fillText("/", 134, 110);

  ctx.fillStyle = "#201811";
  ctx.font = "700 42px 'Palatino Linotype', Georgia, serif";
  ctx.fillText("Style", 188, 122);
  ctx.fillStyle = "#c8962d";
  ctx.font = "700 44px 'Palatino Linotype', Georgia, serif";
  ctx.fillText("Flow", 312, 122);

  ctx.fillStyle = "rgba(79,59,29,0.82)";
  ctx.font = "700 15px 'Segoe UI Variable Text', sans-serif";
  ctx.fillText("RESERVEZ. BRILLEZ.", 188, 148);
  ctx.font = "700 14px 'Segoe UI Variable Text', sans-serif";
  ctx.fillText(`SCENE ${String(sceneIndex + 1).padStart(2, "0")}`, 188, 164);

  fillRoundedRect(790, 112, 192, 8, 4, "rgba(102,74,31,0.11)");
  fillRoundedRect(790, 112, 192 * (playhead / totalDuration), 8, 4, "#c8962d");
  ctx.fillStyle = "rgba(79,59,29,0.84)";
  ctx.font = "600 15px 'Segoe UI Variable Text', sans-serif";
  ctx.fillText(String(Math.floor(playhead)).padStart(2, "0"), 790, 100);

  ctx.save();
  ctx.globalAlpha = 0.16 + Math.sin(time) * 0.03;
  ctx.strokeStyle = "#c8962d";
  ctx.beginPath();
  ctx.arc(988, 112, 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawPhoneShadow(x, y, width, height, blur = 42) {
  ctx.save();
  ctx.translate(x + width / 2, y + height + 30);
  ctx.shadowColor = "rgba(116,82,28,0.22)";
  ctx.shadowBlur = blur;
  ctx.fillStyle = "rgba(116,82,28,0.16)";
  ctx.beginPath();
  ctx.ellipse(0, 0, width * 0.34, height * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPhoneStackDepth(width, height) {
  for (let layer = 4; layer >= 1; layer -= 1) {
    ctx.save();
    ctx.translate(layer * 6, layer * 10);
    ctx.globalAlpha = 0.048 * layer;
    fillRoundedRect(-width / 2, -height / 2, width, height, 60, "#cfab67");
    ctx.restore();
  }
}

function drawPhone(image, options = {}) {
  const {
    x = 300,
    y = 440,
    width = 398,
    height = 812,
    progress = 1,
    rotation = 0,
    borderGlow = "rgba(200,150,45,0.18)"
  } = options;

  const p = easeOutExpo(clamp(progress));
  const scale = lerp(0.92, 1, p);

  drawPhoneShadow(x, y, width, height, 44);

  ctx.save();
  ctx.translate(x + width / 2, y + height / 2 + lerp(44, 0, p));
  ctx.rotate(rotation);
  ctx.scale(scale, scale);
  ctx.globalAlpha = p;

  drawPhoneStackDepth(width, height);
  fillRoundedRect(-width / 2, -height / 2, width, height, 60, "#ffffff");
  strokeRoundedRect(-width / 2, -height / 2, width, height, 60, borderGlow, 2.5);
  fillRoundedRect(-width / 2 + 14, -height / 2 + 14, width - 28, height - 28, 52, "#fbf7ef");

  ctx.save();
  drawRoundedRect(-width / 2 + 24, -height / 2 + 24, width - 48, height - 48, 44);
  ctx.clip();
  ctx.drawImage(image, -width / 2 + 24, -height / 2 + 24, width - 48, height - 48);

  const sheen = ctx.createLinearGradient(-width / 2, -height / 2, width / 2, height / 2);
  sheen.addColorStop(0, "rgba(255,255,255,0.22)");
  sheen.addColorStop(0.24, "rgba(255,255,255,0.04)");
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(-width / 2 + 24, -height / 2 + 24, width - 48, height - 48);

  const vignette = ctx.createLinearGradient(0, -height / 2, 0, height / 2);
  vignette.addColorStop(0, "rgba(255,255,255,0.08)");
  vignette.addColorStop(0.55, "rgba(255,255,255,0)");
  vignette.addColorStop(1, "rgba(100,73,32,0.12)");
  ctx.fillStyle = vignette;
  ctx.fillRect(-width / 2 + 24, -height / 2 + 24, width - 48, height - 48);
  ctx.restore();

  fillRoundedRect(-82, -height / 2 + 50, 164, 18, 9, "rgba(33,24,13,0.94)");
  ctx.restore();
}

function drawTextPanel(scene, progress) {
  const reveal = clamp((progress - 0.04) / 0.66);
  const x = 80;
  const y = 234;
  const titleLines = scene.title;
  const titleLineHeight = 74;
  const titleStartY = y + 72;
  const subtitleStartY = titleStartY + (titleLines.length - 1) * titleLineHeight + 64;
  const subtitleLineHeight = 36;
  const subtitleLines = getWrappedLines(scene.subtitle, 536);
  const subtitleLastY = subtitleStartY + (subtitleLines.length - 1) * subtitleLineHeight;
  const badgeY = subtitleLastY + 62;
  const detailLineHeight = 28;
  const detailLines = getWrappedLines(scene.detail, 386);
  const badgeHeight = Math.max(94, 72 + (detailLines.length - 1) * detailLineHeight);
  const panelTop = y - 40;
  const panelBottom = badgeY + badgeHeight + 28;
  const panelHeight = panelBottom - panelTop;

  ctx.save();
  ctx.globalAlpha = easeInOutCubic(clamp((progress - 0.02) / 0.9));
  ctx.translate(lerp(-42, 0, easeOutBack(clamp(progress / 0.36))), 0);

  fillRoundedRect(x - 16, panelTop, 646, panelHeight, 36, "rgba(255,255,255,0.70)");
  strokeRoundedRect(x - 16, panelTop, 646, panelHeight, 36, "rgba(114,84,35,0.11)");

  ctx.fillStyle = "#c8962d";
  ctx.font = "700 21px 'Segoe UI Variable Text', sans-serif";
  drawLineReveal(scene.kicker || "STYLEFLOW", x, y, 294, reveal * 1.2, 48, 30);

  ctx.fillStyle = "#201811";
  ctx.font = "700 68px 'Palatino Linotype', Georgia, serif";
  ctx.shadowColor = "rgba(255,255,255,0.58)";
  ctx.shadowBlur = 14;
  titleLines.forEach((line, i) => {
    const lineReveal = clamp((reveal - i * 0.1) / 0.72);
    drawLineReveal(line, x, titleStartY + i * titleLineHeight, 558, lineReveal, 84, 62);
  });
  ctx.shadowColor = "transparent";

  ctx.fillStyle = "rgba(56,40,24,0.88)";
  ctx.font = "600 27px 'Segoe UI Variable Text', sans-serif";
  subtitleLines.forEach((line, i) => {
    const lineReveal = clamp((reveal - 0.24 - i * 0.08) / 0.62);
    drawLineReveal(line, x, subtitleStartY + i * subtitleLineHeight, 536, lineReveal, 44, 28);
  });

  const badgeReveal = clamp((progress - 0.44) / 0.4);
  ctx.save();
  ctx.globalAlpha = badgeReveal;
  fillRoundedRect(x, badgeY, 430, badgeHeight, 28, "rgba(255,255,255,0.86)");
  strokeRoundedRect(x, badgeY, 430, badgeHeight, 28, "rgba(200,150,45,0.19)");
  ctx.fillStyle = "#3a2816";
  ctx.font = "600 22px 'Segoe UI Variable Text', sans-serif";
  detailLines.forEach((line, i) => {
    ctx.fillText(line, x + 22, badgeY + 34 + i * detailLineHeight);
  });
  ctx.restore();

  ctx.restore();
}

function drawBadge(text, x, y, width, progress) {
  const p = clamp(progress);
  if (p <= 0) return;
  ctx.save();
  ctx.globalAlpha = p;
  ctx.translate(lerp(40, 0, p), 0);
  fillRoundedRect(x, y, width, 52, 26, "rgba(255,255,255,0.76)");
  strokeRoundedRect(x, y, width, 52, 26, "rgba(200,150,45,0.14)", 1.5);
  ctx.fillStyle = "#2d2217";
  ctx.font = "700 20px 'Segoe UI Variable Text', sans-serif";
  ctx.fillText(text, x + 18, y + 33);
  ctx.restore();
}

function drawHeroScene(scene, localTime, progress) {
  drawTextPanel(scene, progress);
  const float = Math.sin(localTime * 1.8) * 10;
  const twist = -0.03 + Math.sin(localTime * 1.2) * 0.008;
  drawPhone(assets[scene.image], {
    x: 458,
    y: 800 + float,
    width: 406,
    height: 824,
    progress,
    rotation: twist,
    borderGlow: `${scene.accent || "#c8962d"}44`
  });

  ctx.save();
  ctx.globalAlpha = 0.14 * clamp(progress);
  strokeRoundedRect(676, 724, 216, 804, 58, `${scene.accent || "#c8962d"}30`, 2);
  ctx.restore();

  drawBadge("Presence de marque", 650, 1020, 236, clamp((progress - 0.2) / 0.45));
  drawBadge("Motion editoriale", 618, 1094, 226, clamp((progress - 0.28) / 0.45));
  drawBadge("Conversion premium", 660, 1168, 232, clamp((progress - 0.36) / 0.45));
}

function drawDuoScene(scene, localTime, progress) {
  drawTextPanel(scene, progress);
  const drift = Math.sin(localTime * 2) * 8;

  drawPhone(assets[scene.image], {
    x: 170,
    y: 850 + drift,
    width: 388,
    height: 792,
    progress,
    rotation: -0.082 + Math.sin(localTime * 0.9) * 0.008,
    borderGlow: `${scene.accent || "#c8962d"}3b`
  });

  drawPhone(assets[scene.secondaryImage], {
    x: 620,
    y: 992 - drift * 0.7,
    width: 326,
    height: 664,
    progress: clamp((progress - 0.1) / 0.9),
    rotation: 0.09 + Math.cos(localTime * 1.1) * 0.008,
    borderGlow: "rgba(120,91,43,0.12)"
  });

  ctx.save();
  ctx.globalAlpha = 0.10;
  ctx.strokeStyle = `${scene.accent || "#c8962d"}40`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(432, 1274);
  ctx.bezierCurveTo(512, 1174, 566, 1128, 664, 1124);
  ctx.stroke();
  ctx.restore();

  drawBadge("Fluide", 682, 924, 126, clamp((progress - 0.24) / 0.4));
  drawBadge("Rassurant", 700, 988, 162, clamp((progress - 0.32) / 0.4));
}

function drawIntro(scene, localTime, progress) {
  const p = easeInOutCubic(progress);
  ctx.save();
  ctx.translate(WIDTH / 2, HEIGHT / 2 - 210);
  ctx.scale(lerp(0.84, 1, p), lerp(0.84, 1, p));
  ctx.rotate(Math.sin(localTime * 1.4) * 0.014);
  ctx.shadowColor = "rgba(200,150,45,0.18)";
  ctx.shadowBlur = 70;
  fillRoundedRect(-194, -194, 388, 388, 82, "rgba(255,255,255,0.90)");
  ctx.shadowColor = "transparent";
  strokeRoundedRect(-194, -194, 388, 388, 82, "rgba(200,150,45,0.18)", 3);

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = "rgba(200,150,45,0.24)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 232, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 272, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "#201811";
  ctx.font = "900 226px 'Palatino Linotype', Georgia, serif";
  ctx.fillText("F", -62, 76);
  ctx.fillStyle = "#c8962d";
  ctx.font = "900 100px 'Palatino Linotype', Georgia, serif";
  ctx.fillText("/", 38, -10);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = p;
  ctx.textAlign = "center";
  ctx.fillStyle = "#201811";
  ctx.font = "700 118px 'Palatino Linotype', Georgia, serif";
  ctx.fillText(scene.title[0], WIDTH / 2, 1084);
  ctx.fillStyle = "#c8962d";
  ctx.font = "700 66px 'Palatino Linotype', Georgia, serif";
  ctx.fillText(scene.title[1], WIDTH / 2, 1162);
  ctx.fillStyle = "#201811";
  ctx.font = "700 66px 'Palatino Linotype', Georgia, serif";
  ctx.fillText(scene.title[2], WIDTH / 2, 1238);
  ctx.fillStyle = "rgba(68,49,25,0.80)";
  ctx.font = "600 28px 'Segoe UI Variable Text', sans-serif";
  drawWrappedTextCentered(scene.subtitle, WIDTH / 2, 1322, 700, 38);
  ctx.fillStyle = "rgba(68,49,25,0.68)";
  ctx.font = "500 24px 'Segoe UI Variable Text', sans-serif";
  drawWrappedTextCentered(scene.detail, WIDTH / 2, 1422, 620, 32);
  ctx.restore();
}

function drawOutro(scene, localTime, progress) {
  const p = easeInOutCubic(progress);
  ctx.save();
  ctx.globalAlpha = p;
  ctx.textAlign = "center";

  const glow = ctx.createLinearGradient(120, 420, 980, 1500);
  glow.addColorStop(0, "rgba(200,150,45,0)");
  glow.addColorStop(0.5, "rgba(200,150,45,0.22)");
  glow.addColorStop(1, "rgba(200,150,45,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "#c8962d";
  ctx.font = "700 24px 'Segoe UI Variable Text', sans-serif";
  ctx.fillText(scene.kicker.toUpperCase(), WIDTH / 2, 560);

  ctx.fillStyle = "#201811";
  ctx.font = "700 132px 'Palatino Linotype', Georgia, serif";
  ctx.fillText(scene.title[0], WIDTH / 2, 734);

  const pulse = 0.5 + easeInOutSine((Math.sin(localTime * 1.7) + 1) / 2) * 0.5;
  ctx.save();
  ctx.globalAlpha = 0.28 * pulse;
  fillRoundedRect(244, 776, 592, 14, 7, "rgba(200,150,45,0.38)");
  ctx.restore();

  fillRoundedRect(156, 852, 768, 302, 48, "rgba(255,255,255,0.66)");
  strokeRoundedRect(156, 852, 768, 302, 48, "rgba(120,91,43,0.12)");

  ctx.fillStyle = "#372717";
  ctx.font = "700 48px 'Palatino Linotype', Georgia, serif";
  drawWrappedTextCentered(scene.subtitle, WIDTH / 2, 968, 640, 54);

  ctx.fillStyle = "rgba(68,49,25,0.80)";
  ctx.font = "500 28px 'Segoe UI Variable Text', sans-serif";
  drawWrappedTextCentered(scene.detail, WIDTH / 2, 1164, 680, 38);

  fillRoundedRect(270, 1260, 540, 82, 40, "rgba(255,255,255,0.80)");
  strokeRoundedRect(270, 1260, 540, 82, 40, "rgba(200,150,45,0.18)");
  ctx.fillStyle = "#2d2217";
  ctx.font = "700 32px 'Palatino Linotype', Georgia, serif";
  ctx.fillText("Reservez. Achetez. Rayonnez.", WIDTH / 2, 1314);

  fillRoundedRect(360, 1382 + Math.sin(localTime * 2) * 6, 360, 58, 29, "rgba(255,255,255,0.88)");
  ctx.fillStyle = "#2d2217";
  ctx.font = "700 24px 'Segoe UI Variable Text', sans-serif";
  ctx.fillText("jolofera.com", WIDTH / 2, 1418 + Math.sin(localTime * 2) * 6);
  ctx.restore();
}

function drawCinematicGrade(timeInSeconds) {
  const drift = Math.sin(timeInSeconds * 0.55) * 0.5 + 0.5;
  ctx.save();
  const topVignette = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  topVignette.addColorStop(0, "rgba(87,60,22,0.12)");
  topVignette.addColorStop(0.4, "rgba(255,255,255,0)");
  topVignette.addColorStop(1, "rgba(56,38,17,0.09)");
  ctx.fillStyle = topVignette;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const edgeLight = ctx.createRadialGradient(WIDTH * 0.78, HEIGHT * 0.2, 0, WIDTH * 0.78, HEIGHT * 0.2, 420);
  edgeLight.addColorStop(0, `rgba(255,255,255,${(0.2 + drift * 0.08).toFixed(3)})`);
  edgeLight.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = edgeLight;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.restore();
}

function drawSceneTransitionFlash(timeInSeconds) {
  let flash = 0;
  for (let i = 0; i < sceneOffsets.length; i++) {
    const distance = Math.abs(timeInSeconds - sceneOffsets[i]);
    if (distance < 0.16) {
      flash = Math.max(flash, 1 - distance / 0.16);
    }
  }

  if (flash <= 0) return;

  ctx.save();
  ctx.globalAlpha = flash * 0.10;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.restore();
}

function renderScene(scene, sceneTime) {
  const p = clamp(sceneTime / scene.duration);
  if (scene.type === "intro") return drawIntro(scene, sceneTime, p);
  if (scene.type === "outro") return drawOutro(scene, sceneTime, p);
  if (scene.type === "duo") return drawDuoScene(scene, sceneTime, p);
  return drawHeroScene(scene, sceneTime, p);
}

function renderFrame(timeInSeconds) {
  drawBackground(timeInSeconds);
  drawSweepBands(timeInSeconds);

  let sceneIndex = 0;
  for (let i = 0; i < scenes.length; i++) {
    const start = sceneOffsets[i];
    const end = start + scenes[i].duration;
    if (timeInSeconds >= start && timeInSeconds <= end) {
      sceneIndex = i;
      renderScene(scenes[i], timeInSeconds - start);
      break;
    }
  }

  drawTopBar(sceneIndex, timeInSeconds);
  drawCinematicGrade(timeInSeconds);
  drawSceneTransitionFlash(timeInSeconds);
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
        statusText.textContent = "Apercu termine. La version signature est prete a etre exportee.";
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
    ? "Apercu en lecture. Cette version vise un rendu signature."
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
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_500_000 });
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
  statusText.textContent = "Export en cours... garde la page ouverte jusqu'au telechargement.";

  try {
    const blob = await renderVideoBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "jolofera-signature-film.webm";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    statusText.textContent = "Export termine. Le fichier jolofera-signature-film.webm vient d'etre telecharge.";
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

  window.renderPromoBase64 = async () => {
    const blob = await renderVideoBlob();
    return blobToDataUrl(blob);
  };
}

init().catch((error) => {
  console.error(error);
  statusText.textContent = `Impossible de charger les assets: ${error.message}`;
});
