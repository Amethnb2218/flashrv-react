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
    duration: 2.3,
    title: "Jolof'Era",
    subtitle: "La reservation, le commerce et la marque dans un seul geste.",
    detail: "Une experience mobile pensee comme une campagne premium."
  },
  {
    type: "hero",
    duration: 2.0,
    kicker: "ENTRER",
    title: "Une premiere vision qui donne deja confiance.",
    subtitle: "La page d'accueil pose le niveau, clarifie l'offre et met la desirabilite au centre.",
    image: "home.jpeg",
    accent: "Une vraie presence de marque des la premiere seconde."
  },
  {
    type: "hero",
    duration: 2.0,
    kicker: "RESERVER",
    title: "Choisir un salon doit sembler immediat.",
    subtitle: "Les services sont lisibles, l'intention monte vite, l'action parait evidente.",
    image: "salon-detail.jpeg",
    accent: "Un parcours qui pousse naturellement vers le rendez-vous."
  },
  {
    type: "duo",
    duration: 2.2,
    kicker: "RASSURER",
    title: "Le detail transforme l'envie en decision.",
    subtitle: "Prix, duree, acompte et recapitulatif: tout inspire le controle et la clarte.",
    image: "service-modal.jpeg",
    secondaryImage: "booking-summary.jpeg",
    accent: "La fluidite devient un argument de confiance."
  },
  {
    type: "hero",
    duration: 2.0,
    kicker: "VENDRE",
    title: "Une boutique mobile doit ressembler a une vitrine.",
    subtitle: "Les produits gagnent en valeur quand le cadre, le rythme et la lecture sont justes.",
    image: "boutique-detail.jpeg",
    accent: "Plus de desir. Plus de clarte. Plus de conversion."
  },
  {
    type: "hero",
    duration: 1.8,
    kicker: "VALIDER",
    title: "La fin d'achat doit rester elegante.",
    subtitle: "La confirmation prolonge la sensation de qualite jusqu'au dernier ecran.",
    image: "order-success.jpeg",
    accent: "Une conclusion nette renforce toute l'experience."
  },
  {
    type: "duo",
    duration: 2.2,
    kicker: "PILOTER",
    title: "Le back-office doit etre aussi fort que la facade.",
    subtitle: "Articles, commandes, revenus: la gestion reste premium quand elle reste claire.",
    image: "dashboard-articles.jpeg",
    secondaryImage: "dashboard-orders.jpeg",
    accent: "L'efficacite compte autant que le style."
  },
  {
    type: "hero",
    duration: 1.9,
    kicker: "LANCER",
    title: "L'onboarding doit ouvrir une ambition, pas la ralentir.",
    subtitle: "Salon ou boutique, l'entree dans la plateforme reste simple, claire et rassurante.",
    image: "onboarding.jpeg",
    accent: "Le produit accompagne la croissance sans bruit."
  },
  {
    type: "outro",
    duration: 2.8,
    title: "Jolof'Era",
    subtitle: "Reservez. Achetez. Rayonnez.",
    detail: "Agence Cut. Une version plus marquee, plus scenarisee, plus memorisable."
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
  bg.addColorStop(0.46, "#f6ead6");
  bg.addColorStop(1, "#efddc3");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const glowA = ctx.createRadialGradient(160, 200, 0, 160, 200, 460);
  glowA.addColorStop(0, "rgba(200,147,40,0.18)");
  glowA.addColorStop(1, "rgba(200,147,40,0)");
  ctx.fillStyle = glowA;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const glowB = ctx.createRadialGradient(840, 220, 0, 840, 220, 360);
  glowB.addColorStop(0, "rgba(255,255,255,0.62)");
  glowB.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glowB;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = "rgba(114,84,35,0.16)";
  for (let i = -HEIGHT; i < WIDTH + 200; i += 98) {
    ctx.beginPath();
    ctx.moveTo(i + (time * 44) % 98, 0);
    ctx.lineTo(i - 280 + (time * 44) % 98, HEIGHT);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "rgba(255,255,255,0.46)";
  ctx.beginPath();
  ctx.ellipse(880, 240, 160, 40, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(240, 1540, 220, 52, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBrandBar(time) {
  fillRoundedRect(56, 54, 968, 118, 38, "rgba(255,255,255,0.64)");
  strokeRoundedRect(56, 54, 968, 118, 38, "rgba(108,82,39,0.14)");

  fillRoundedRect(82, 72, 382, 86, 28, "rgba(255,249,242,0.96)");
  strokeRoundedRect(82, 72, 382, 86, 28, "rgba(200,147,40,0.16)", 1.5);
  drawBrandLogo(96, 79, 350, 72, 1);

  ctx.fillStyle = "rgba(79,60,31,0.78)";
  ctx.font = "700 16px 'Segoe UI Variable Text', sans-serif";
  ctx.fillText("AGENCE CUT", 488, 124);

  fillRoundedRect(792, 112, 188, 8, 4, "rgba(108,82,39,0.12)");
  fillRoundedRect(792, 112, 188 * (playhead / totalDuration), 8, 4, "#c89328");
  ctx.fillStyle = "rgba(79,60,31,0.82)";
  ctx.font = "600 16px 'Segoe UI Variable Text', sans-serif";
  ctx.fillText(String(Math.floor(playhead)).padStart(2, "0"), 792, 100);

  ctx.save();
  ctx.globalAlpha = 0.12 + Math.sin(time) * 0.03;
  ctx.strokeStyle = "#c89328";
  ctx.beginPath();
  ctx.arc(988, 112, 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawSweepBands(time) {
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.translate(0, 250);
  ctx.rotate(-0.12);
  const band = ctx.createLinearGradient(0, 0, WIDTH, 0);
  band.addColorStop(0, "rgba(200,147,40,0)");
  band.addColorStop(0.5, "rgba(200,147,40,0.22)");
  band.addColorStop(1, "rgba(200,147,40,0)");
  ctx.fillStyle = band;
  ctx.fillRect(-120, 0, WIDTH + 240, 42);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.10;
  ctx.translate(0, 1340);
  ctx.rotate(0.12);
  const band2 = ctx.createLinearGradient(0, 0, WIDTH, 0);
  band2.addColorStop(0, "rgba(255,255,255,0)");
  band2.addColorStop(0.5, "rgba(255,255,255,0.56)");
  band2.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = band2;
  ctx.fillRect(-120, 0, WIDTH + 240, 30);
  ctx.restore();
}

function drawPhoneShadow(x, y, width, height, blur = 40) {
  ctx.save();
  ctx.translate(x + width / 2, y + height + 32);
  ctx.shadowColor = "rgba(121,88,34,0.20)";
  ctx.shadowBlur = blur;
  ctx.fillStyle = "rgba(121,88,34,0.14)";
  ctx.beginPath();
  ctx.ellipse(0, 0, width * 0.34, height * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPhoneDepth(width, height) {
  for (let layer = 4; layer >= 1; layer -= 1) {
    ctx.save();
    ctx.translate(layer * 6, layer * 10);
    ctx.globalAlpha = 0.05 * layer;
    fillRoundedRect(-width / 2, -height / 2, width, height, 62, "#d4ae6d");
    ctx.restore();
  }
}

function drawPhone(image, options = {}) {
  const {
    x = 300,
    y = 440,
    width = 400,
    height = 818,
    progress = 1,
    rotation = 0,
    borderGlow = "rgba(200,147,40,0.18)"
  } = options;

  const eased = easeOutExpo(clamp(progress));
  const scale = lerp(0.92, 1, eased);

  drawPhoneShadow(x, y, width, height, 44);

  ctx.save();
  ctx.translate(x + width / 2, y + height / 2 + lerp(42, 0, eased));
  ctx.rotate(rotation);
  ctx.scale(scale, scale);
  ctx.globalAlpha = eased;

  drawPhoneDepth(width, height);
  ctx.shadowColor = "rgba(143,103,34,0.16)";
  ctx.shadowBlur = 54;
  ctx.shadowOffsetY = 28;
  fillRoundedRect(-width / 2, -height / 2, width, height, 62, "#ffffff");
  ctx.shadowColor = "transparent";
  strokeRoundedRect(-width / 2, -height / 2, width, height, 62, borderGlow, 2.5);
  fillRoundedRect(-width / 2 + 14, -height / 2 + 14, width - 28, height - 28, 54, "#fbf7f0");

  ctx.save();
  drawRoundedRect(-width / 2 + 24, -height / 2 + 24, width - 48, height - 48, 46);
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
  vignette.addColorStop(0.54, "rgba(255,255,255,0)");
  vignette.addColorStop(1, "rgba(98,73,33,0.12)");
  ctx.fillStyle = vignette;
  ctx.fillRect(-width / 2 + 24, -height / 2 + 24, width - 48, height - 48);
  ctx.restore();

  fillRoundedRect(-82, -height / 2 + 50, 164, 18, 9, "rgba(34,25,13,0.94)");
  ctx.restore();
}

function drawGlassBadge(text, x, y, width) {
  fillRoundedRect(x, y, width, 52, 26, "rgba(255,255,255,0.76)");
  strokeRoundedRect(x, y, width, 52, 26, "rgba(200,147,40,0.14)", 1.5);
  ctx.fillStyle = "#2d2217";
  ctx.font = "700 20px 'Segoe UI Variable Text', sans-serif";
  ctx.fillText(text, x + 18, y + 33);
}

function drawTextPanel(scene, progress) {
  const p = easeInOutQuart(clamp(progress));
  const x = 80;
  const y = 228;

  ctx.save();
  ctx.globalAlpha = p;
  ctx.translate(lerp(-40, 0, p), 0);

  fillRoundedRect(x - 12, y - 36, 622, 468, 34, "rgba(255,255,255,0.56)");
  strokeRoundedRect(x - 12, y - 36, 622, 468, 34, "rgba(120,91,43,0.10)");

  ctx.fillStyle = "#c89328";
  ctx.font = "700 20px 'Segoe UI Variable Text', sans-serif";
  ctx.fillText(scene.kicker || "Jolof'Era", x, y);

  ctx.fillStyle = "#201710";
  ctx.font = "700 60px 'Palatino Linotype', Georgia, serif";
  ctx.shadowColor = "rgba(255,255,255,0.58)";
  ctx.shadowBlur = 14;
  const titleLines = getWrappedLines(scene.title, 540);
  wrapText(scene.title, x, y + 62, 540, 66);
  ctx.shadowColor = "transparent";
  const titleBottom = y + 62 + (titleLines.length - 1) * 66;

  ctx.fillStyle = "rgba(56,40,24,0.88)";
  ctx.font = "600 26px 'Segoe UI Variable Text', sans-serif";
  const subtitleStartY = titleBottom + 56;
  const subtitleLines = getWrappedLines(scene.subtitle, 520);
  wrapText(scene.subtitle, x, subtitleStartY, 520, 34);
  const subtitleBottom = subtitleStartY + (subtitleLines.length - 1) * 34;

  const accentY = subtitleBottom + 44;
  fillRoundedRect(x, accentY, 404, 86, 26, "rgba(255,255,255,0.78)");
  strokeRoundedRect(x, accentY, 404, 86, 26, "rgba(200,147,40,0.16)");
  ctx.fillStyle = "#3a2816";
  ctx.font = "600 21px 'Segoe UI Variable Text', sans-serif";
  wrapText(scene.accent, x + 20, accentY + 30, 362, 26);
  ctx.restore();
}

function drawHeroTags(progress) {
  const p = easeOutExpo(clamp((progress - 0.18) / 0.82));
  const tags = [
    { text: "Presence de marque", x: 650, y: 1020, w: 236 },
    { text: "Motion editoriale", x: 618, y: 1094, w: 226 },
    { text: "Conversion premium", x: 660, y: 1168, w: 232 }
  ];

  ctx.save();
  ctx.globalAlpha = p;
  ctx.translate(lerp(68, 0, p), 0);
  for (const tag of tags) {
    drawGlassBadge(tag.text, tag.x, tag.y, tag.w);
  }
  ctx.restore();
}

function drawHeroScene(scene, localTime, progress) {
  drawTextPanel(scene, progress);
  const float = Math.sin(localTime * 1.9) * 10;
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
  ctx.globalAlpha = 0.14 * clamp(progress);
  strokeRoundedRect(676, 724, 216, 804, 58, "rgba(200,147,40,0.12)", 2);
  ctx.restore();

  drawHeroTags(progress);
}

function drawDuoScene(scene, localTime, progress) {
  drawTextPanel(scene, progress);
  const drift = Math.sin(localTime * 2.1) * 8;

  drawPhone(assets[scene.image], {
    x: 188,
    y: 848 + drift,
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
    rotation: 0.09 + Math.cos(localTime * 1.1) * 0.008,
    borderGlow: "rgba(120,91,43,0.12)"
  });

  ctx.save();
  ctx.globalAlpha = 0.10;
  ctx.strokeStyle = "rgba(200,147,40,0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(432, 1274);
  ctx.bezierCurveTo(512, 1174, 566, 1128, 664, 1124);
  ctx.stroke();
  ctx.restore();

  drawGlassBadge("Fluide", 682, 924, 126);
  drawGlassBadge("Rassurant", 700, 988, 162);
}

function drawIntro(scene, localTime, progress) {
  const p = easeInOutQuart(progress);
  ctx.save();
  ctx.translate(WIDTH / 2, HEIGHT / 2 - 210);
  ctx.scale(lerp(0.84, 1, p), lerp(0.84, 1, p));
  ctx.rotate(Math.sin(localTime * 1.4) * 0.015);
  ctx.shadowColor = "rgba(200,147,40,0.18)";
  ctx.shadowBlur = 70;
  fillRoundedRect(-194, -194, 388, 388, 82, "rgba(255,255,255,0.90)");
  ctx.shadowColor = "transparent";
  strokeRoundedRect(-194, -194, 388, 388, 82, "rgba(200,147,40,0.18)", 3);

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = "rgba(200,147,40,0.24)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 232, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 272, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "#201710";
  ctx.font = "900 226px 'Palatino Linotype', Georgia, serif";
  ctx.fillText("F", -62, 76);
  ctx.fillStyle = "#c89328";
  ctx.font = "900 100px 'Palatino Linotype', Georgia, serif";
  ctx.fillText("/", 38, -10);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = p;
  ctx.textAlign = "center";
  ctx.fillStyle = "#201710";
  ctx.font = "700 118px 'Palatino Linotype', Georgia, serif";
  ctx.fillText(scene.title, WIDTH / 2, 1084);
  ctx.fillStyle = "#c89328";
  ctx.font = "700 30px 'Segoe UI Variable Text', sans-serif";
  wrapTextCentered(scene.subtitle, WIDTH / 2, 1150, 760, 38);
  ctx.fillStyle = "rgba(68,49,25,0.78)";
  ctx.font = "500 28px 'Segoe UI Variable Text', sans-serif";
  wrapTextCentered(scene.detail, WIDTH / 2, 1260, 680, 38);
  ctx.restore();
}

function drawOutro(scene, localTime, progress) {
  const p = easeInOutQuart(progress);
  ctx.save();
  ctx.globalAlpha = p;
  ctx.textAlign = "center";

  const glow = ctx.createLinearGradient(120, 420, 980, 1500);
  glow.addColorStop(0, "rgba(200,147,40,0)");
  glow.addColorStop(0.5, "rgba(200,147,40,0.22)");
  glow.addColorStop(1, "rgba(200,147,40,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "#c89328";
  ctx.font = "700 26px 'Segoe UI Variable Text', sans-serif";
  ctx.fillText("AGENCE CUT", WIDTH / 2, 558);

  ctx.fillStyle = "#201710";
  ctx.font = "700 128px 'Palatino Linotype', Georgia, serif";
  ctx.fillText(scene.title, WIDTH / 2, 744);

  fillRoundedRect(156, 852, 768, 302, 48, "rgba(255,255,255,0.66)");
  strokeRoundedRect(156, 852, 768, 302, 48, "rgba(120,91,43,0.12)");

  ctx.fillStyle = "#372717";
  ctx.font = "700 48px 'Palatino Linotype', Georgia, serif";
  wrapTextCentered(scene.subtitle, WIDTH / 2, 968, 640, 54);

  ctx.fillStyle = "rgba(68,49,25,0.80)";
  ctx.font = "500 28px 'Segoe UI Variable Text', sans-serif";
  wrapTextCentered(scene.detail, WIDTH / 2, 1164, 680, 38);

  fillRoundedRect(360, 1382 + Math.sin(localTime * 2.1) * 6, 360, 58, 29, "rgba(255,255,255,0.88)");
  ctx.fillStyle = "#2d2217";
  ctx.font = "700 24px 'Segoe UI Variable Text', sans-serif";
  ctx.fillText("jolofera.com", WIDTH / 2, 1418 + Math.sin(localTime * 2.1) * 6);
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

  if (flash <= 0) {
    return;
  }

  ctx.save();
  ctx.globalAlpha = flash * 0.10;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
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
  drawSweepBands(timeInSeconds);
  drawBrandBar(timeInSeconds);
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
        statusText.textContent = "Apercu termine. La version 5 est prete a etre exportee.";
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
    ? "Apercu en lecture. Cette version vise un rendu campagne premium."
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
    a.download = "jolofera-agence-cut.webm";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    statusText.textContent = "Export termine. Le fichier jolofera-agence-cut.webm vient d'etre telecharge.";
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
