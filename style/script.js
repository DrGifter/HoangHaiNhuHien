const canvas = document.getElementById("matrixCanvas");
const ctx = canvas.getContext("2d");

const audio = document.getElementById('sound');
let hasTriedPlay = false;

function playFromSecond(second = 5) {
  if (audio.readyState >= 1) {
    audio.currentTime = second;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => waitForUserInteraction(second));
    }
  } else {
    audio.addEventListener('loadedmetadata', () => {
      audio.currentTime = second;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => waitForUserInteraction(second));
      }
    });
  }
}

function waitForUserInteraction(second = 5) {
  if (hasTriedPlay) return;
  hasTriedPlay = true;

  const playOnInteraction = () => {
    audio.currentTime = second;
    audio.play().catch(() => {});
    document.removeEventListener('click', playOnInteraction);
    document.removeEventListener('touchstart', playOnInteraction);
  };

  document.addEventListener('click', playOnInteraction);
  document.addEventListener('touchstart', playOnInteraction);
}

window.addEventListener('DOMContentLoaded', () => {
  playFromSecond(5);
});

let W, H;
function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

const characters = "HAPPYBIRTHDAYCHUCMUNGSINHNHATTUOIMOIZUIZE";
const fontSize = 20;
const columns = Math.floor(W / fontSize);
const drops = Array(columns).fill(1);
const texts = [
  "3", "2", "1", "🎂", "HAPPY BIRTHDAY", 
  "29.07.2025", 
  "Chúc Mừng Sinh Nhật",
  "Ngày Đặc Biệt Của Em",
  "❤️ Như Hiền ❤️",
  "Chúc Em Luôn Xinh Đẹp",
  "Nhiều Niềm Vui",
  "Thật Nhiều Hạnh Phúc",
  "Và Mọi Chuyện Tốt Đẹp",
  "Sẽ Luôn Đến Với Em",
  "Mãi Bên Nhau Nhé",
  "Chúc Em Luôn Bên Anh",
  "Anh Yêu Em ❤️",
];
const BASE_DISPLAY_TIME = 3000;
const EXPLOSION_TIME = 100;
const CHAR_APPEAR_INTERVAL = 100;

let currentDisplayTime = BASE_DISPLAY_TIME;
const offCanvas = document.createElement("canvas");
const offCtx = offCanvas.getContext("2d", { willReadFrequently: true });

let targetPoints = [], dots = [];
let currentTextIndex = 0, currentCharIndex = 0;
let lastChangeTime = Date.now();
let lastCharTime = Date.now();

let state = "forming";
let explosionStartTime = 0;
let hue = 0;

const fallingImages = [
  "style/img/Anh (1).jpg",
  "style/img/Anh (2).jpg",
  "style/img/Anh (3).jpg",
  "style/img/Anh (4).jpg",
  "style/img/Anh (5).jpg",
  "style/img/Anh (6).jpg",
  "style/img/Anh (7).jpg",
  "style/img/Anh (8).jpg",
  "style/img/Anh (9).jpg",
  "style/img/Anh (10).jpg",
  "style/img/Anh (11).jpg",
  "style/img/Anh (12).jpg",
  "style/img/Anh (13).jpg",
].map(src => {
  const img = new Image();
  img.src = src;
  return img;
});

let showFallingImages = false;
let fallingObjects = [];
let fallingStartTime = 0;
const FIRST_IMAGE_DELAY = 2000; 

class FallingImage {
  constructor(img) {
    this.img = img;
    this.size = Math.min(W, H) * 0.4;
    this.x = (W - this.size) / 2;
    this.y = (H - this.size) / 2;
    this.opacity = 1;
    this.startTime = Date.now();
    this.scale = 0.8;
  }

  update() {
    const elapsed = Date.now() - this.startTime;

    if (elapsed < 1000) {
      this.scale = 0.8 + 0.2 * (elapsed / 1000); // từ 0.8 → 1.0
    } else {
      this.scale = 1;
    }

    if (elapsed > 3000) {
      this.opacity = Math.max(0, 1 - (elapsed - 3000) / 1000);
    }
  }

  draw(ctx) {
    const radius = 30;
    const drawSize = this.size * this.scale;
    const drawX = (W - drawSize) / 2;
    const drawY = (H - drawSize) / 2;

    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.beginPath();
    this.roundRectPath(ctx, drawX, drawY, drawSize, drawSize, radius);
    ctx.clip();
    ctx.drawImage(this.img, drawX, drawY, drawSize, drawSize);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  isFinished() {
    return this.opacity <= 0;
  }

  roundRectPath(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }
}


function getTextPixels(text) {
  offCanvas.width = W;
  offCanvas.height = H;
  offCtx.clearRect(0, 0, W, H);
  let fontSizeOverlay = 500;
  offCtx.font = `bold ${fontSizeOverlay}px Arial`;
  while (offCtx.measureText(text).width > W * 0.9) {
    fontSizeOverlay -= 2;
    offCtx.font = `bold ${fontSizeOverlay}px Arial`;
  }
  offCtx.fillStyle = "white";
  offCtx.textAlign = "center";
  offCtx.textBaseline = "middle";
  offCtx.fillText(text, W / 2, H / 2);
  const imageData = offCtx.getImageData(0, 0, W, H);
  const pixels = [];
  const gap = 6;
  for (let y = 0; y < H; y += gap) {
    for (let x = 0; x < W; x += gap) {
      const idx = (y * W + x) * 4;
      const r = imageData.data[idx];
      const g = imageData.data[idx + 1];
      const b = imageData.data[idx + 2];
      const a = imageData.data[idx + 3];
      if (r + g + b > 200 && a > 128) {
        pixels.push({ x, y });
      }
    }
  }
  return pixels;
}

class Dot {
  constructor(targetX, targetY) {
    this.x = Math.random() * W;
    this.y = Math.random() * H;
    this.targetX = targetX;
    this.targetY = targetY;
    this.vx = 0;
    this.vy = 0;
    this.size = 3;
  }
  update() {
    if (state === "forming") {
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const easing = 0.1;
      this.vx = (this.vx + dx * easing) * 0.75;
      this.vy = (this.vy + dy * easing) * 0.75;
      this.x += this.vx;
      this.y += this.vy;
    } else if (state === "exploding") {
      this.x += this.vx;
      this.y += this.vy;
      this.vx *= 1.05;
      this.vy *= 1.05;
    }
  }
  draw(ctx) {
    ctx.fillStyle = `hsl(${(hue + this.x / W * 100) % 360}, 100%, 65%)`;
    ctx.fillRect(this.x, this.y, this.size, this.size);
  }
}

function initDots(text) {
  let partialText = text.substring(0, currentCharIndex);
  if (partialText.length === 0) partialText = " ";
  targetPoints = getTextPixels(partialText);
  if (dots.length === 0) {
    dots = targetPoints.map(p => new Dot(p.x, p.y));
  } else {
    for (let i = 0; i < dots.length; i++) {
      if (i < targetPoints.length) {
        dots[i].targetX = targetPoints[i].x;
        dots[i].targetY = targetPoints[i].y;
      } else {
        dots[i].targetX = Math.random() * W;
        dots[i].targetY = H + 100 + Math.random() * 200;
      }
    }
    while (dots.length < targetPoints.length) {
      const p = targetPoints[dots.length];
      dots.push(new Dot(p.x, p.y));
    }
  }
  state = "forming";
}

function explodeDots() {
  for (const dot of dots) {
    dot.vx = (Math.random() - 0.5) * 10;
    dot.vy = (Math.random() - 0.5) * 10;
  }
}

function drawMatrixRain() {
  hue = (hue + 1) % 360;
  ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
  ctx.fillRect(0, 0, W, H);
  ctx.font = fontSize + "px monospace";

  for (let i = 0; i < drops.length; i++) {
    const textChar = characters[Math.floor(Math.random() * characters.length)];
    ctx.fillStyle = `hsl(${(hue + i * 10) % 360}, 100%, 65%)`;
    ctx.fillText(textChar, i * fontSize, drops[i] * fontSize);
    if (drops[i] * fontSize > H || Math.random() > 0.975) drops[i] = 0;
    drops[i]++;
  }

  for (const dot of dots) {
    dot.update();
    dot.draw(ctx);
  }

  const now = Date.now();

  if (showFallingImages) {
    if (fallingObjects.length === 0 && now - fallingStartTime >= FIRST_IMAGE_DELAY && fallingImages.length > 0) {
      const img = fallingImages.shift();
      fallingObjects.push(new FallingImage(img));
    }

    if (fallingObjects.length > 0) {
      const current = fallingObjects[0];
      current.update();
      current.draw(ctx);
      if (current.isFinished()) {
        fallingObjects.shift();
      }
    }

    return;
  }

  if (state === "forming") {
    if (currentCharIndex < texts[currentTextIndex].length) {
      if (now - lastCharTime > CHAR_APPEAR_INTERVAL) {
        currentCharIndex++;
        initDots(texts[currentTextIndex]);
        lastCharTime = now;
      }
    } else {
      if (now - lastChangeTime > currentDisplayTime) {
        state = "exploding";
        explosionStartTime = now;
        explodeDots();
      }
    }
  } else if (state === "exploding") {
    if (now - explosionStartTime > EXPLOSION_TIME) {
      currentTextIndex++;
      if (currentTextIndex >= texts.length) {
        showFallingImages = true;
        fallingStartTime = Date.now();
        return;
      }
      currentCharIndex = 0;
      const nextText = texts[currentTextIndex];
      currentDisplayTime = BASE_DISPLAY_TIME + (nextText.length > 5 ? 3000 : 0);
      initDots(nextText);
      lastChangeTime = now;
      lastCharTime = now;
      state = "forming";
    }
  }
}

currentDisplayTime = BASE_DISPLAY_TIME + (texts[0].length > 4 ? 2000 : 0);
initDots(texts[currentTextIndex]);
lastChangeTime = Date.now();
lastCharTime = Date.now();
setInterval(drawMatrixRain, 50);
