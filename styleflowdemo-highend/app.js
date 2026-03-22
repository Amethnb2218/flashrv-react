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
    duration: 2.3,
    title: "STYLEFLOW",
    subtitle: "The beauty marketplace, redesigned.",
    detail: "Reservation, shopping, gestion pro. Une meme signature mobile."
  },
  {
    type: "hero",
    duration: 2.1,
    kicker: "DISCOVER",
    title: "Every first touch should feel expensive.",
    subtitle: "Une entree produit qui pose la marque, la confiance et l'envie.",
    image: "home.jpeg",
    accent: "Premium motion. Premium perception."
  },
  {
    type: "hero",
    duration: 2.0,
    kicker: "BOOK",
    title: "Choose the salon. Book the moment.",
    subtitle: "Des services lisibles, un CTA clair et une intention qui monte vite.",
    image: "salon-detail.jpeg",
    accent: "Le desir glisse vers l'action."
  },
  {
    type: "duo",
    duration: 2.1,
    kicker: "CONVERT",
    title: "Details close the deal.",
    subtitle: "Prix, duree, acompte et recap. Tout est sous controle.",
    image: "service-modal.jpeg",
    secondaryImage: "booking-summary.jpeg",
    accent: "Une reservation qui se signe sans friction."
  },
  {
    type: "hero",
    duration: 2.0,
    kicker: "SHOP",
    title: "Commerce that looks curated.",
    subtitle: "La boutique s'affiche comme une vitrine premium, pas comme un simple catalogue.",
    image: "boutique-detail.jpeg",
    accent: "More style. More confidence. More sales."
  },
  {
    type: "hero",
    duration: 1.75,
    kicker: "CONFIRM",
    title: "A clean finish feels like quality.",
    subtitle: "Une confirmation forte qui rassure et valorise l'achat.",
    image: "order-success.jpeg",
    accent: "L'experience reste nette jusqu'a la derniere seconde."
  },
  {
    type: "duo",
    duration: 2.2,
    kicker: "OPERATE",
    title: "A premium brand also needs premium control.",
    subtitle: "Articles, commandes, revenus. Le back-office suit le niveau du front.",
    image: "dashboard-articles.jpeg",
    secondaryImage: "dashboard-orders.jpeg",
    accent: "L'elegance visuelle rencontre l'efficacite business."
  },
  {
    type: "hero",
    duration: 1.85,
    kicker: "LAUNCH",
    title: "Open the door for every pro.",
    subtitle: "Salon ou boutique, l'onboarding guide la croissance avec clarte.",
    image: "onboarding.jpeg",
    accent: "Le produit parle marque avant meme l'inscription."
  },
  {
    type: "outro",
    duration: 2.9,
    title: "STYLEFLOW",
    subtitle: "Reserve. Shop. Shine.",
    detail: "Director's Cut. La version campagne premium."
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
  bg.addColorStop(0, "#080707");
  bg.addColorStop(0.48, "#130f0d");
  bg.addColorStop(1, "#040404");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const g1 = ctx.createRadialGradient(220, 240, 0, 220, 240, 520);
  g1.addColorStop(0, "rgba(241,196,106,0.26)");
  g1.addColorStop(1, "rgba(241,196,106,0)");
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const gx = WIDTH * (0.78 + Math.sin(time * 0.7) * 0.04);
  const gy = HEIGHT * (0.82 + Math.cos(time * 0.55) * 0.04);
  const g2 = ctx.createRadialGradient(gx, gy, 0, gx, gy, 420);
  g2.addColorStop(0, "rgba(184,117,74,0.20)");
  g2.addColorStop(1, "rgba(184,117,74,0)");
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  for (let i = -HEIGHT; i < WIDTH + 200; i += 92) {
    ctx.beginPath();
    ctx.moveTo(i + (time * 70) % 92, 0);
    ctx.lineTo(i - 260 + (time * 70) % 92, HEIGHT);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.14;
  for (let i = 0; i < 24; i++) {
    const px = ((i * 317) % WIDTH) + Math.sin(time * 0.7 + i) * 20;
    const py = ((i * 419) % HEIGHT) + Math.cos(time * 0.6 + i) * 28;
    ctx.fillStyle = i % 3 === 0 ? "#f1c46a" : "#ffffff";
    ctx.beginPath();
    ctx.arc(px, py, 1.5 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawTopBrand(time) {
  fillRoundedRect(54, 52, 972, 120, 40, "rgba(10,10,10,0.58)");
  strokeRoundedRect(54, 52, 972, 120, 40, "rgba(255,255,255,0.12)");

  fillRoundedRect(80, 76, 82, 82, 24, "#141214");
  ctx.fillStyle = "#f8efdf";
  ctx.font = "900 52px Georgia, serif";
  ctx.fillText("F", 104, 136);
  ctx.fillStyle = "#f1c46a";
  ctx.font = "900 32px Georgia, serif";
  ctx.fillText("/", 134, 109);

  ctx.fillStyle = "#f8efdf";
  ctx.font = "700 40px Georgia, serif";
  ctx.fillText("Style", 184, 124);
  ctx.fillStyle = "#f1c46a";
  ctx.fillText("Flow", 292, 124);

  ctx.fillStyle = "rgba(248,239,223,0.84)";
  ctx.font = "700 16px 'Segoe UI Variable Text', sans-serif";
  ctx.fillText("DIRECTOR'S CUT", 186, 152);

  fillRoundedRect(776, 108, 208, 7, 4, "rgba(255,255,255,0.12)");
  fillRoundedRect(776, 108, 208 * (playhead / totalDuration), 7, 4, "#f1c46a");
  ctx.fillStyle = "rgba(248,239,223,0.70)";
  ctx.font = "600 16px 'Segoe UI Variable Text', sans-serif";
  ctx.fillText(String(Math.floor(playhead)).padStart(2, "0"), 776, 98);

  ctx.save();
  ctx.globalAlpha = 0.16 + Math.sin(time) * 0.03;
  ctx.strokeStyle = "#f1c46a";
  ctx.beginPath();
  ctx.arc(988, 110, 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawAccentRibbon(time) {
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.translate(0, 240);
  const ribbon = ctx.createLinearGradient(0, 0, WIDTH, 0);
  ribbon.addColorStop(0, "rgba(241,196,106,0)");
  ribbon.addColorStop(0.48, "rgba(241,196,106,0.18)");
  ribbon.addColorStop(1, "rgba(241,196,106,0)");
  ctx.fillStyle = ribbon;
  ctx.rotate(-0.12);
  ctx.fillRect(-120, 0, WIDTH + 240, 42);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.10;
  ctx.translate(0, 1280);
  ctx.rotate(0.1);
  const ribbon2 = ctx.createLinearGradient(0, 0, WIDTH, 0);
  ribbon2.addColorStop(0, "rgba(184,117,74,0)");
  ribbon2.addColorStop(0.5, "rgba(184,117,74,0.24)");
  ribbon2.addColorStop(1, "rgba(184,117,74,0)");
  ctx.fillStyle = ribbon2;
  ctx.fillRect(-100, 0, WIDTH + 200, 32);
  ctx.restore();
}

function drawPhone(image, options = {}) {
  const {
    x = 280,
    y = 420,
    width = 500,
    height = 1020,
    progress = 1,
    rotation = 0,
    borderGlow = "rgba(241,196,106,0.18)"
  } = options;

  const eased = easeOutExpo(clamp(progress));
  const scale = lerp(0.88, 1, eased);

  ctx.save();
  ctx.translate(x + width / 2, y + height / 2 + lerp(70, 0, eased));
  ctx.rotate(rotation);
  ctx.scale(scale, scale);
  ctx.globalAlpha = eased;

  ctx.shadowColor = "rgba(0,0,0,0.52)";
  ctx.shadowBlur = 64;
  ctx.shadowOffsetY = 30;
  fillRoundedRect(-width / 2, -height / 2, width, height, 64, "#0f1012");
  ctx.shadowColor = "transparent";
  strokeRoundedRect(-width / 2, -height / 2, width, height, 64, borderGlow, 2.5);
  fillRoundedRect(-width / 2 + 14, -height / 2 + 14, width - 28, height - 28, 54, "#030304");

  ctx.save();
  drawRoundedRect(-width / 2 + 26, -height / 2 + 26, width - 52, height - 52, 46);
  ctx.clip();
  ctx.drawImage(image, -width / 2 + 26, -height / 2 + 26, width - 52, height - 52);

  const sheen = ctx.createLinearGradient(-width / 2, -height / 2, width / 2, height / 2);
  sheen.addColorStop(0, "rgba(255,255,255,0.18)");
  sheen.addColorStop(0.22, "rgba(255,255,255,0.04)");
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(-width / 2 + 26, -height / 2 + 26, width - 52, height - 52);

  const cinema = ctx.createLinearGradient(0, -height / 2, 0, height / 2);
  cinema.addColorStop(0, "rgba(0,0,0,0.03)");
  cinema.addColorStop(0.55, "rgba(0,0,0,0.00)");
  cinema.addColorStop(1, "rgba(0,0,0,0.24)");
  ctx.fillStyle = cinema;
  ctx.fillRect(-width / 2 + 26, -height / 2 + 26, width - 52, height - 52);
  ctx.restore();

  fillRoundedRect(-86, -height / 2 + 52, 172, 18, 9, "rgba(14,14,16,0.96)");
  ctx.restore();
}

function drawTextPanel(scene, progress) {
  const p = easeInOutQuart(clamp(progress));
  const x = 78;
  const y = 224;

  ctx.save();
  ctx.globalAlpha = p;
  ctx.translate(lerp(-56, 0, p), 0);

  fillRoundedRect(x - 12, y - 36, 612, 472, 34, "rgba(8,8,10,0.30)");
  strokeRoundedRect(x - 12, y - 36, 612, 472, 34, "rgba(255,255,255,0.08)");

  ctx.fillStyle = "#f1c46a";
  ctx.font = "700 22px 'Segoe UI Variable Text', sans-serif";
  ctx.fillText(scene.kicker || "STYLEFLOW", x, y);

  ctx.fillStyle = "#f8efdf";
  ctx.font = "700 70px Georgia, serif";
  const titleLines = getWrappedLines(scene.title, 540);
  wrapText(scene.title, x, y + 66, 540, 76);
  const titleBottom = y + 66 + (titleLines.length - 1) * 76;

  ctx.fillStyle = "rgba(251,245,236,0.94)";
  ctx.font = "600 28px 'Segoe UI Variable Text', sans-serif";
  const subtitleStartY = titleBottom + 72;
  const subtitleLines = getWrappedLines(scene.subtitle, 520);
  wrapText(scene.subtitle, x, subtitleStartY, 520, 38);
  const subtitleBottom = subtitleStartY + (subtitleLines.length - 1) * 38;

  const accentY = subtitleBottom + 50;
  fillRoundedRect(x, accentY, 392, 88, 26, "rgba(10,10,10,0.52)");
  strokeRoundedRect(x, accentY, 392, 88, 26, "rgba(241,196,106,0.18)");
  ctx.fillStyle = "#fff5e3";
  ctx.font = "600 22px 'Segoe UI Variable Text', sans-serif";
  wrapText(scene.accent, x + 20, accentY + 32, 350, 28);
  ctx.restore();
}

function drawFloatingTags(progress) {
  const p = easeOutExpo(clamp((progress - 0.18) / 0.82));
  const tags = [
    { text: "Editorial UX", x: 690, y: 1010, w: 188 },
    { text: "Premium Story", x: 632, y: 1084, w: 210 },
    { text: "Mobile Conversion", x: 676, y: 1158, w: 244 }
  ];

  ctx.save();
  ctx.globalAlpha = p;
  ctx.translate(lerp(90, 0, p), 0);
  for (const tag of tags) {
    fillRoundedRect(tag.x, tag.y, tag.w, 50, 25, "rgba(255,246,224,0.94)");
    ctx.fillStyle = "#15110a";
    ctx.font = "700 21px 'Segoe UI Variable Text', sans-serif";
    ctx.fillText(tag.text, tag.x + 18, tag.y + 33);
  }
  ctx.restore();
}

function drawHeroScene(scene, localTime, progress) {
  drawTextPanel(scene, progress);
  const float = Math.sin(localTime * 2.1) * 14;
  drawPhone(assets[scene.image], {
    x: 402,
    y: 782 + float,
    width: 420,
    height: 858,
    progress,
    rotation: -0.035
  });
  drawFloatingTags(progress);
}

function drawDuoScene(scene, localTime, progress) {
  drawTextPanel(scene, progress);
  const drift = Math.sin(localTime * 2.4) * 10;
  drawPhone(assets[scene.image], {
    x: 180,
    y: 840 + drift,
    width: 396,
    height: 808,
    progress,
    rotation: -0.082
  });
  drawPhone(assets[scene.secondaryImage], {
    x: 604,
    y: 1010 - drift * 0.8,
    width: 320,
    height: 652,
    progress: clamp((progress - 0.1) / 0.9),
    rotation: 0.086,
    borderGlow: "rgba(255,255,255,0.16)"
  });
}

function drawIntro(scene, localTime, progress) {
  const p = easeInOutQuart(progress);
  ctx.save();
  ctx.translate(WIDTH / 2, HEIGHT / 2 - 210);
  ctx.scale(lerp(0.82, 1, p), lerp(0.82, 1, p));
  ctx.rotate(Math.sin(localTime * 1.8) * 0.02);
  ctx.shadowColor = "rgba(241,196,106,0.34)";
  ctx.shadowBlur = 88;
  fillRoundedRect(-196, -196, 392, 392, 84, "#131214");
  ctx.shadowColor = "transparent";
  strokeRoundedRect(-196, -196, 392, 392, 84, "rgba(241,196,106,0.20)", 3);
  ctx.fillStyle = "#f8efdf";
  ctx.font = "900 230px Georgia, serif";
  ctx.fillText("F", -62, 78);
  ctx.fillStyle = "#f1c46a";
  ctx.font = "900 100px Georgia, serif";
  ctx.fillText("/", 38, -10);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = p;
  ctx.textAlign = "center";
  ctx.fillStyle = "#f8efdf";
  ctx.font = "700 122px Georgia, serif";
  ctx.fillText(scene.title, WIDTH / 2, 1080);
  ctx.fillStyle = "#f1c46a";
  ctx.font = "700 34px 'Segoe UI Variable Text', sans-serif";
  ctx.fillText(scene.subtitle.toUpperCase(), WIDTH / 2, 1154);
  ctx.fillStyle = "rgba(248,239,223,0.76)";
  ctx.font = "500 30px 'Segoe UI Variable Text', sans-serif";
  wrapTextCentered(scene.detail, WIDTH / 2, 1242, 700, 40);
  ctx.restore();
}

function drawOutro(scene, localTime, progress) {
  const p = easeInOutQuart(progress);
  ctx.save();
  ctx.globalAlpha = p;
  ctx.textAlign = "center";

  const glow = ctx.createLinearGradient(100, 440, 980, 1500);
  glow.addColorStop(0, "rgba(241,196,106,0)");
  glow.addColorStop(0.5, "rgba(241,196,106,0.30)");
  glow.addColorStop(1, "rgba(241,196,106,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "#f1c46a";
  ctx.font = "700 28px 'Segoe UI Variable Text', sans-serif";
  ctx.fillText("DIRECTOR'S CUT", WIDTH / 2, 564);

  ctx.fillStyle = "#f8efdf";
  ctx.font = "700 132px Georgia, serif";
  ctx.fillText(scene.title, WIDTH / 2, 748);

  fillRoundedRect(152, 852, 776, 300, 48, "rgba(255,255,255,0.06)");
  strokeRoundedRect(152, 852, 776, 300, 48, "rgba(241,196,106,0.16)");

  ctx.fillStyle = "#fff5e3";
  ctx.font = "700 48px Georgia, serif";
  wrapTextCentered(scene.subtitle, WIDTH / 2, 972, 640, 56);

  ctx.fillStyle = "rgba(248,239,223,0.74)";
  ctx.font = "500 30px 'Segoe UI Variable Text', sans-serif";
  wrapTextCentered(scene.detail, WIDTH / 2, 1166, 680, 40);

  fillRoundedRect(364, 1380 + Math.sin(localTime * 2.2) * 6, 352, 58, 29, "rgba(255,246,224,0.92)");
  ctx.fillStyle = "#15110a";
  ctx.font = "700 24px 'Segoe UI Variable Text', sans-serif";
  ctx.fillText("jolofera.com", WIDTH / 2, 1417 + Math.sin(localTime * 2.2) * 6);
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
  drawAccentRibbon(timeInSeconds);
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
        statusText.textContent = "Apercu termine. La version 3 est prete a etre exportee.";
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
    ? "Apercu en lecture. Cette version pousse le rendu campagne premium."
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
    a.download = "jolofera-directors-cut.webm";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    statusText.textContent = "Export termine. Le fichier jolofera-directors-cut.webm vient d'etre telecharge.";
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
