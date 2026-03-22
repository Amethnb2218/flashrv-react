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
    duration: 2.2,
    title: "STYLEFLOW",
    subtitle: "La reservation et le shopping, elevés au niveau premium.",
    detail: "Une plateforme pensee pour vendre, reserver et faire rayonner les meilleures adresses."
  },
  {
    type: "hero",
    duration: 2.1,
    kicker: "DECOUVRIR",
    title: "Une premiere impression qui inspire confiance.",
    subtitle: "Une vitrine claire, soignee et desirante pour mettre la marque au premier plan.",
    image: "home.jpeg",
    accent: "Une interface qui donne envie d'entrer."
  },
  {
    type: "hero",
    duration: 2.0,
    kicker: "RESERVER",
    title: "Choisissez votre salon. Reservez en quelques instants.",
    subtitle: "Des services visibles, une navigation rassurante et un chemin fluide jusqu'au rendez-vous.",
    image: "salon-detail.jpeg",
    accent: "Chaque detail rapproche de la conversion."
  },
  {
    type: "duo",
    duration: 2.1,
    kicker: "CONFIRMER",
    title: "Une reservation claire, elegante et sans friction.",
    subtitle: "Prix, duree, acompte et recapitulatif: tout est compréhensible au premier regard.",
    image: "service-modal.jpeg",
    secondaryImage: "booking-summary.jpeg",
    accent: "Le design retire le doute et valorise l'action."
  },
  {
    type: "hero",
    duration: 2.0,
    kicker: "COMMANDER",
    title: "Une boutique mobile qui ressemble a une vraie vitrine premium.",
    subtitle: "Les produits gagnent en desir, en clarte et en pouvoir de conversion.",
    image: "boutique-detail.jpeg",
    accent: "Style, commerce et confiance dans le meme geste."
  },
  {
    type: "hero",
    duration: 1.8,
    kicker: "VALIDER",
    title: "La fin d'achat doit paraitre simple et forte.",
    subtitle: "La confirmation rassure, valorise et prolonge la qualité de l'experience.",
    image: "order-success.jpeg",
    accent: "La satisfaction se joue aussi a la derniere ecran."
  },
  {
    type: "duo",
    duration: 2.2,
    kicker: "PILOTER",
    title: "Un espace pro elegant doit aussi etre efficace.",
    subtitle: "Articles, commandes, revenus: tout reste lisible, propre et actionnable.",
    image: "dashboard-articles.jpeg",
    secondaryImage: "dashboard-orders.jpeg",
    accent: "Une image premium jusque dans l'outil de gestion."
  },
  {
    type: "hero",
    duration: 1.9,
    kicker: "LANCER",
    title: "Salon ou boutique, l'entree doit sembler naturelle.",
    subtitle: "L'onboarding accompagne l'utilisateur sans bruit et sans complexite.",
    image: "onboarding.jpeg",
    accent: "Le produit guide, la marque rassure."
  },
  {
    type: "outro",
    duration: 2.8,
    title: "STYLEFLOW",
    subtitle: "Reservez. Achetez. Rayonnez.",
    detail: "Edition Claire. Une version plus lumineuse, plus chic et plus publicitaire."
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

function easeOutExpo(t) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function easeInOutQuart(t) {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
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
  if (lineText) lines.push(lineText);
  return lines;
}

function wrapText(text, x, startY, maxWidth, lineHeight) {
  const lines = getWrappedLines(text, maxWidth);
  lines.forEach((lineText, index) => ctx.fillText(lineText, x, startY + index * lineHeight));
}

function wrapTextCentered(text, centerX, startY, maxWidth, lineHeight) {
  const lines = getWrappedLines(text, maxWidth);
  lines.forEach((lineText, index) => ctx.fillText(lineText, centerX, startY + index * lineHeight));
}

function drawBackdrop(time) {
  const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  bg.addColorStop(0, "#fffaf2");
  bg.addColorStop(0.48, "#f7eddf");
  bg.addColorStop(1, "#f0e1cb");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const glowA = ctx.createRadialGradient(220, 220, 0, 220, 220, 520);
  glowA.addColorStop(0, "rgba(201,151,47,0.18)");
  glowA.addColorStop(1, "rgba(201,151,47,0)");
  ctx.fillStyle = glowA;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const px = WIDTH * (0.78 + Math.sin(time * 0.6) * 0.03);
  const py = HEIGHT * (0.2 + Math.cos(time * 0.55) * 0.03);
  const glowB = ctx.createRadialGradient(px, py, 0, px, py, 400);
  glowB.addColorStop(0, "rgba(255,255,255,0.55)");
  glowB.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glowB;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = "rgba(112,86,41,0.18)";
  for (let i = -HEIGHT; i < WIDTH + 200; i += 92) {
    ctx.beginPath();
    ctx.moveTo(i + (time * 52) % 92, 0);
    ctx.lineTo(i - 260 + (time * 52) % 92, HEIGHT);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.06;
  for (let i = 0; i < 8; i++) {
    const rx = 110 + i * 126 + Math.sin(time * 0.5 + i) * 18;
    const ry = 1480 + Math.cos(time * 0.7 + i) * 24;
    ctx.fillStyle = i % 2 === 0 ? "rgba(201,151,47,0.24)" : "rgba(255,255,255,0.38)";
    ctx.beginPath();
    ctx.ellipse(rx, ry, 120, 24, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "rgba(255,255,255,0.44)";
  ctx.beginPath();
  ctx.ellipse(900, 240, 160, 44, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(260, 1540, 220, 52, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTopBrand(time) {
  fillRoundedRect(54, 52, 972, 122, 40, "rgba(255,255,255,0.62)");
  strokeRoundedRect(54, 52, 972, 122, 40, "rgba(108,82,39,0.14)");

  fillRoundedRect(82, 78, 82, 82, 24, "#151515");
  ctx.fillStyle = "#f9f1e0";
  ctx.font = "900 52px Georgia, serif";
  ctx.fillText("F", 104, 136);
  ctx.fillStyle = "#c9972f";
  ctx.font = "900 32px Georgia, serif";
  ctx.fillText("/", 134, 109);

  ctx.fillStyle = "#221911";
  ctx.font = "700 38px 'Palatino Linotype', Georgia, serif";
  ctx.fillText("Style", 188, 125);
  ctx.fillStyle = "#c9972f";
  ctx.font = "700 40px 'Palatino Linotype', Georgia, serif";
  ctx.fillText("Flow", 295, 125);

  ctx.fillStyle = "rgba(76,59,31,0.78)";
  ctx.font = "700 16px 'Segoe UI Variable Text', sans-serif";
  ctx.fillText("EDITION CLAIRE", 190, 153);

  fillRoundedRect(786, 111, 198, 8, 4, "rgba(108,82,39,0.12)");
  fillRoundedRect(786, 111, 198 * (playhead / totalDuration), 8, 4, "#c9972f");
  ctx.fillStyle = "rgba(76,59,31,0.86)";
  ctx.font = "600 16px 'Segoe UI Variable Text', sans-serif";
  ctx.fillText(String(Math.floor(playhead)).padStart(2, "0"), 786, 100);

  ctx.save();
  ctx.globalAlpha = 0.14 + Math.sin(time) * 0.03;
  ctx.strokeStyle = "#c9972f";
  ctx.beginPath();
  ctx.arc(994, 112, 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawSoftRibbon(time) {
  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.translate(0, 260);
  ctx.rotate(-0.11);
  const ribbon = ctx.createLinearGradient(0, 0, WIDTH, 0);
  ribbon.addColorStop(0, "rgba(201,151,47,0)");
  ribbon.addColorStop(0.5, "rgba(201,151,47,0.22)");
  ribbon.addColorStop(1, "rgba(201,151,47,0)");
  ctx.fillStyle = ribbon;
  ctx.fillRect(-120, 0, WIDTH + 240, 46);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.translate(0, 1360);
  ctx.rotate(0.12);
  const ribbon2 = ctx.createLinearGradient(0, 0, WIDTH, 0);
  ribbon2.addColorStop(0, "rgba(255,255,255,0)");
  ribbon2.addColorStop(0.5, "rgba(255,255,255,0.58)");
  ribbon2.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = ribbon2;
  ctx.fillRect(-120, 0, WIDTH + 240, 34);
  ctx.restore();
}

function drawPhoneShadow(x, y, width, height, blur = 34) {
  ctx.save();
  ctx.translate(x + width / 2, y + height + 34);
  ctx.shadowColor = "rgba(131,95,30,0.20)";
  ctx.shadowBlur = blur;
  ctx.fillStyle = "rgba(131,95,30,0.14)";
  ctx.beginPath();
  ctx.ellipse(0, 0, width * 0.35, height * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawDepthLayers(width, height) {
  for (let layer = 4; layer >= 1; layer -= 1) {
    ctx.save();
    ctx.translate(layer * 7, layer * 12);
    ctx.globalAlpha = 0.055 * layer;
    fillRoundedRect(-width / 2, -height / 2, width, height, 62, "#d6b06f");
    ctx.restore();
  }
}

function drawGlassBadge(text, x, y, width) {
  fillRoundedRect(x, y, width, 52, 26, "rgba(255,255,255,0.72)");
  strokeRoundedRect(x, y, width, 52, 26, "rgba(201,151,47,0.16)", 1.5);
  ctx.fillStyle = "#2d2217";
  ctx.font = "700 21px 'Segoe UI Variable Text', sans-serif";
  ctx.fillText(text, x + 18, y + 33);
}

function drawPhone(image, options = {}) {
  const {
    x = 300,
    y = 430,
    width = 430,
    height = 876,
    progress = 1,
    rotation = 0,
    borderGlow = "rgba(201,151,47,0.18)"
  } = options;

  const eased = easeOutExpo(clamp(progress));
  const scale = lerp(0.92, 1, eased);
  drawPhoneShadow(x, y, width, height, 44);

  ctx.save();
  ctx.translate(x + width / 2, y + height / 2 + lerp(48, 0, eased));
  ctx.rotate(rotation);
  ctx.scale(scale, scale);
  ctx.globalAlpha = eased;

  drawDepthLayers(width, height);
  ctx.shadowColor = "rgba(143,103,34,0.18)";
  ctx.shadowBlur = 54;
  ctx.shadowOffsetY = 28;
  fillRoundedRect(-width / 2, -height / 2, width, height, 62, "#ffffff");
  ctx.shadowColor = "transparent";
  strokeRoundedRect(-width / 2, -height / 2, width, height, 62, borderGlow, 2.5);
  fillRoundedRect(-width / 2 + 14, -height / 2 + 14, width - 28, height - 28, 54, "#faf6ef");

  ctx.save();
  drawRoundedRect(-width / 2 + 26, -height / 2 + 26, width - 52, height - 52, 46);
  ctx.clip();
  ctx.drawImage(image, -width / 2 + 26, -height / 2 + 26, width - 52, height - 52);

  const sheen = ctx.createLinearGradient(-width / 2, -height / 2, width / 2, height / 2);
  sheen.addColorStop(0, "rgba(255,255,255,0.22)");
  sheen.addColorStop(0.24, "rgba(255,255,255,0.04)");
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(-width / 2 + 26, -height / 2 + 26, width - 52, height - 52);

  const vignette = ctx.createLinearGradient(0, -height / 2, 0, height / 2);
  vignette.addColorStop(0, "rgba(255,255,255,0.08)");
  vignette.addColorStop(0.54, "rgba(255,255,255,0)");
  vignette.addColorStop(1, "rgba(98,73,33,0.12)");
  ctx.fillStyle = vignette;
  ctx.fillRect(-width / 2 + 26, -height / 2 + 26, width - 52, height - 52);
  ctx.restore();

  fillRoundedRect(-84, -height / 2 + 52, 168, 18, 9, "rgba(32,24,12,0.92)");
  ctx.restore();
}

function drawTextPanel(scene, progress) {
  const p = easeInOutQuart(clamp(progress));
  const x = 80;
  const y = 226;

  ctx.save();
  ctx.globalAlpha = p;
  ctx.translate(lerp(-44, 0, p), 0);

  fillRoundedRect(x - 12, y - 36, 620, 470, 34, "rgba(255,255,255,0.56)");
  strokeRoundedRect(x - 12, y - 36, 620, 470, 34, "rgba(120,91,43,0.10)");

  ctx.fillStyle = "#c9972f";
  ctx.font = "700 20px 'Segoe UI Variable Text', sans-serif";
  ctx.fillText(scene.kicker || "STYLEFLOW", x, y);

  ctx.fillStyle = "#241b14";
  ctx.font = "700 60px 'Palatino Linotype', Georgia, serif";
  ctx.shadowColor = "rgba(255,255,255,0.58)";
  ctx.shadowBlur = 14;
  const titleLines = getWrappedLines(scene.title, 540);
  wrapText(scene.title, x, y + 62, 540, 66);
  ctx.shadowColor = "transparent";
  const titleBottom = y + 62 + (titleLines.length - 1) * 66;

  ctx.fillStyle = "rgba(54,39,24,0.88)";
  ctx.font = "600 26px 'Segoe UI Variable Text', sans-serif";
  const subtitleStartY = titleBottom + 56;
  const subtitleLines = getWrappedLines(scene.subtitle, 520);
  wrapText(scene.subtitle, x, subtitleStartY, 520, 34);
  const subtitleBottom = subtitleStartY + (subtitleLines.length - 1) * 34;

  const accentY = subtitleBottom + 44;
  fillRoundedRect(x, accentY, 402, 86, 26, "rgba(255,255,255,0.78)");
  strokeRoundedRect(x, accentY, 402, 86, 26, "rgba(201,151,47,0.16)");
  ctx.fillStyle = "#3a2816";
  ctx.font = "600 21px 'Segoe UI Variable Text', sans-serif";
  wrapText(scene.accent, x + 20, accentY + 30, 360, 26);
  ctx.restore();
}

function drawFloatingTags(progress) {
  const p = easeOutExpo(clamp((progress - 0.18) / 0.82));
  const tags = [
    { text: "Premium clair", x: 680, y: 1020, w: 188 },
    { text: "Motion editoriale", x: 612, y: 1094, w: 242 },
    { text: "Presence de marque", x: 662, y: 1168, w: 236 }
  ];

  ctx.save();
  ctx.globalAlpha = p;
  ctx.translate(lerp(72, 0, p), 0);
  for (const tag of tags) {
    drawGlassBadge(tag.text, tag.x, tag.y, tag.w);
  }
  ctx.restore();
}

function drawHeroScene(scene, localTime, progress) {
  drawTextPanel(scene, progress);
  const float = Math.sin(localTime * 1.9) * 11;
  const twist = -0.024 + Math.sin(localTime * 1.2) * 0.008;
  drawPhone(assets[scene.image], {
    x: 430,
    y: 810 + float,
    width: 394,
    height: 804,
    progress,
    rotation: twist
  });
  ctx.save();
  ctx.globalAlpha = 0.16 * clamp(progress);
  strokeRoundedRect(680, 720, 208, 804, 56, "rgba(201,151,47,0.12)", 2);
  ctx.restore();
  drawFloatingTags(progress);
}

function drawDuoScene(scene, localTime, progress) {
  drawTextPanel(scene, progress);
  const drift = Math.sin(localTime * 2.1) * 8;
  drawPhone(assets[scene.image], {
    x: 186,
    y: 846 + drift,
    width: 388,
    height: 792,
    progress,
    rotation: -0.082 + Math.sin(localTime * 0.9) * 0.008
  });
  drawPhone(assets[scene.secondaryImage], {
    x: 606,
    y: 1010 - drift * 0.7,
    width: 312,
    height: 636,
    progress: clamp((progress - 0.1) / 0.9),
    rotation: 0.09 + Math.cos(localTime * 1.2) * 0.008,
    borderGlow: "rgba(120,91,43,0.12)"
  });
  ctx.save();
  ctx.globalAlpha = 0.10;
  ctx.strokeStyle = "rgba(201,151,47,0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(430, 1274);
  ctx.bezierCurveTo(510, 1174, 564, 1128, 664, 1124);
  ctx.stroke();
  ctx.restore();
  drawGlassBadge("Fluide", 680, 922, 128);
  drawGlassBadge("Rassurant", 700, 986, 164);
}

function drawSceneTransitionFlash(timeInSeconds) {
  let flash = 0;
  for (let i = 0; i < sceneOffsets.length; i++) {
    const distance = Math.abs(timeInSeconds - sceneOffsets[i]);
    if (distance < 0.16) {
      flash = Math.max(flash, 1 - distance / 0.16);
    }
  }

  if (flash <= 0) {
    return;
  }

  ctx.save();
  ctx.globalAlpha = flash * 0.10;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.restore();
}

function drawIntro(scene, localTime, progress) {
  const p = easeInOutQuart(progress);
  ctx.save();
  ctx.translate(WIDTH / 2, HEIGHT / 2 - 210);
  ctx.scale(lerp(0.84, 1, p), lerp(0.84, 1, p));
  ctx.rotate(Math.sin(localTime * 1.4) * 0.015);
  ctx.shadowColor = "rgba(201,151,47,0.18)";
  ctx.shadowBlur = 70;
  fillRoundedRect(-194, -194, 388, 388, 82, "rgba(255,255,255,0.88)");
  ctx.shadowColor = "transparent";
  strokeRoundedRect(-194, -194, 388, 388, 82, "rgba(201,151,47,0.18)", 3);
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = "rgba(201,151,47,0.24)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 232, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 272, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = "#221911";
  ctx.font = "900 226px Georgia, serif";
  ctx.fillText("F", -62, 76);
  ctx.fillStyle = "#c9972f";
  ctx.font = "900 100px Georgia, serif";
  ctx.fillText("/", 38, -10);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = p;
  ctx.textAlign = "center";
  ctx.fillStyle = "#241b14";
  ctx.font = "700 120px Georgia, serif";
  ctx.fillText(scene.title, WIDTH / 2, 1084);
  ctx.fillStyle = "#c9972f";
  ctx.font = "700 32px 'Segoe UI Variable Text', sans-serif";
  ctx.fillText(scene.subtitle.toUpperCase(), WIDTH / 2, 1154);
  ctx.fillStyle = "rgba(68,49,25,0.82)";
  ctx.font = "500 30px 'Segoe UI Variable Text', sans-serif";
  wrapTextCentered(scene.detail, WIDTH / 2, 1244, 710, 40);
  ctx.restore();
}

function drawOutro(scene, localTime, progress) {
  const p = easeInOutQuart(progress);
  ctx.save();
  ctx.globalAlpha = p;
  ctx.textAlign = "center";

  const glow = ctx.createLinearGradient(100, 440, 980, 1500);
  glow.addColorStop(0, "rgba(201,151,47,0)");
  glow.addColorStop(0.5, "rgba(201,151,47,0.22)");
  glow.addColorStop(1, "rgba(201,151,47,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "#c9972f";
  ctx.font = "700 28px 'Segoe UI Variable Text', sans-serif";
  ctx.fillText("EDITION CLAIRE", WIDTH / 2, 564);

  ctx.fillStyle = "#241b14";
  ctx.font = "700 128px Georgia, serif";
  ctx.shadowColor = "rgba(255,255,255,0.45)";
  ctx.shadowBlur = 14;
  ctx.fillText(scene.title, WIDTH / 2, 748);
  ctx.shadowColor = "transparent";

  fillRoundedRect(152, 852, 776, 300, 48, "rgba(255,255,255,0.66)");
  strokeRoundedRect(152, 852, 776, 300, 48, "rgba(120,91,43,0.12)");

  ctx.fillStyle = "#372717";
  ctx.font = "700 48px Georgia, serif";
  wrapTextCentered(scene.subtitle, WIDTH / 2, 972, 640, 56);

  ctx.fillStyle = "rgba(68,49,25,0.80)";
  ctx.font = "500 30px 'Segoe UI Variable Text', sans-serif";
  wrapTextCentered(scene.detail, WIDTH / 2, 1166, 680, 40);

  fillRoundedRect(360, 1380 + Math.sin(localTime * 2.1) * 6, 360, 58, 29, "rgba(255,255,255,0.88)");
  ctx.fillStyle = "#2d2217";
  ctx.font = "700 24px 'Segoe UI Variable Text', sans-serif";
  ctx.fillText("jolofera.com", WIDTH / 2, 1417 + Math.sin(localTime * 2.1) * 6);
  ctx.restore();
}

function renderScene(scene, sceneTime) {
  const progress = clamp(sceneTime / scene.duration);
  if (scene.type === "intro") return drawIntro(scene, sceneTime, progress);
  if (scene.type === "outro") return drawOutro(scene, sceneTime, progress);
  if (scene.type === "duo") return drawDuoScene(scene, sceneTime, progress);
  return drawHeroScene(scene, sceneTime, progress);
}

function renderFrame(timeInSeconds) {
  drawBackdrop(timeInSeconds);
  drawSoftRibbon(timeInSeconds);
  drawTopBrand(timeInSeconds);
  for (let i = 0; i < scenes.length; i++) {
    const start = sceneOffsets[i];
    const end = start + scenes[i].duration;
    if (timeInSeconds >= start && timeInSeconds <= end) {
      renderScene(scenes[i], timeInSeconds - start);
      break;
    }
  }
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
        statusText.textContent = "Apercu termine. La version 4 est prete a etre exportee.";
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
    ? "Apercu en lecture. Cette version mise sur la lumiere, le raffinement et la marque."
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
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
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
    a.download = "jolofera-edition-claire.webm";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    statusText.textContent = "Export termine. Le fichier jolofera-edition-claire.webm vient d'etre telecharge.";
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
