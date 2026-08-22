const bg = document.getElementById('bg');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const countdown = document.getElementById('countdown');
const flash = document.getElementById('flash');

const enterBtn = document.getElementById('enterBtn');
const photoModeBtn = document.getElementById('photoModeBtn');
const videoModeBtn = document.getElementById('videoModeBtn');
const colorBtn = document.getElementById('colorBtn');
const bwBtn = document.getElementById('bwBtn');
const printBtn = document.getElementById('printBtn');
const restartBtn = document.getElementById('restartBtn');

let mode = null;          
let filterChoice = null; 
let photos = [];
let shotsNeeded = 0;
let shooting = false;

/* CAMERA */
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => video.srcObject = stream);

/* ASPECT RATIO HELPER (THE FIX FOR STRETCHING) */
function drawImageProp(targetCtx, img, x, y, w, h) {
    let iw = img.width, ih = img.height;
    let r = Math.min(w / iw, h / ih);
    let nw = iw * r, nh = ih * r;
    let cx, cy, cw, ch, ar = 1;

    if (nw < w) ar = w / nw;                             
    if (Math.abs(ar - 1) < 1e-14 && nh < h) ar = h / nh; 
    nw *= ar; nh *= ar;

    cw = iw / (nw / w); ch = ih / (nh / h);
    cx = (iw - cw) * 0.5; cy = (ih - ch) * 0.5;

    targetCtx.drawImage(img, cx, cy, cw, ch, x, y, w, h);
}

/* ACTIONS */
enterBtn.onclick = () => {
  bg.src = 'B22_Photobooth_Interface.jpg';
  video.style.display = 'block';
  resetState();
};

photoModeBtn.onclick = () => { mode = 'photo'; shotsNeeded = 2; };
videoModeBtn.onclick = () => { mode = 'video'; shotsNeeded = 4; };

colorBtn.onclick = () => startShoot('color');
bwBtn.onclick = () => startShoot('bw');

function startShoot(filter) {
  if (!mode || shooting) return;
  filterChoice = filter;
  photos = [];
  shooting = true;
  takeCountdown(3);
}

function takeCountdown(n) {
  countdown.textContent = n;
  if (n === 0) {
    countdown.textContent = '';
    capture();
    return;
  }
  setTimeout(() => takeCountdown(n - 1), 1000);
}

/* CAPTURE + FILTERS */
function capture() {
  // Flash effect
  flash.classList.remove('flash-active');
  void flash.offsetWidth; 
  flash.classList.add('flash-active');

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  ctx.save();
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  // Pixel Manipulation for Filters
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i+1], b = data[i+2];
    if (filterChoice === 'bw') {
      // 1. Calculate weighted luminance (standard B&W)
    let avg = r * 0.3 + g * 0.59 + b * 0.11;

    // 2. Add "Crushy" Contrast 
    // This pushes darks darker and brights brighter
    avg = (avg - 128) * 0.9 + 140;

    // 3. Add a "Creamy" Vintage Tint
    // By giving Red and Green a tiny boost over Blue, we get a subtle ivory feel
    data[i]     = avg + 5;  // Red
    data[i + 1] = avg + 2;  // Green
    data[i + 2] = avg - 5;  // Blue (Lower blue = more yellow/warmth)

    // 4. Add "Film Grain" (Optional)
    let noise = (Math.random() - 0.5) * 12; 
    data[i] += noise;
    data[i+1] += noise;
    data[i+2] += noise;
} else {
       /* // FUJIFILM VIBE
data[i]     = (r * 0.90);        // Slightly pull back Reds
data[i + 1] = (g * 1.05) + 5;    // Boost Greens slightly
data[i + 2] = (b * 1.10) + 10;   // Boost Blues for "clean" whites

// Add a tiny bit of brightness
for (let j = 0; j < 3; j++) {
  data[i+j] = data[i+j] + 10; 
} */
       // 90s DISPOSABLE
let contrast = 1.3; // High contrast
for (let j = 0; j < 3; j++) {
  // Apply a punchy contrast curve
  data[i+j] = (data[i+j] - 128) * contrast + 128;
  // Add a slight "exposure" boost
  data[i+j] += 15;
}
// Keep colors balanced but vibrant
data[i] = data[i] * 1.05; // Tiny red boost
data[i+2] = data[i+2] * 1.05; // Tiny blue boost
        // MUTED PASTEL
data[i]     = (r * 1.00) + 30;   // Lift Reds (warm but not yellow)
data[i + 1] = (g * 0.95) + 20;   // Lift Greens
data[i + 2] = (b * 1.00) + 30;   // Lift Blues (keeps it "airy")

// Desaturate slightly to get that "matte" look
const gray = (data[i] + data[i+1] + data[i+2]) / 3;
data[i] = data[i] * 0.8 + gray * 0.2;
data[i+1] = data[i+1] * 0.8 + gray * 0.2;
data[i+2] = data[i+2] * 0.8 + gray * 0.2; // 
     /* // Vintage warm look
      data[i] = (r * 0.393) + (g * 0.769) + (b * 0.189) + 10;
      data[i+1] = (r * 0.349) + (g * 0.686) + (b * 0.168);
      data[i+2] = (r * 0.272) + (g * 0.534) + (b * 0.131);*/
    }
  }
  ctx.putImageData(imageData, 0, 0);
  photos.push(canvas.toDataURL('image/png'));

  if (photos.length < shotsNeeded) {
    setTimeout(() => takeCountdown(3), 1000);
  } else {
    shooting = false;
  }
}

/* PRINTING / VIEWING */
printBtn.onclick = () => {
  if (photos.length !== shotsNeeded) return alert('Photos not ready yet');
  if (mode === 'photo') openPhotoStrip();
  if (mode === 'video') openVideoStrip();
};

function openPhotoStrip() {
  const c = document.createElement('canvas');
  c.width = 600; c.height = 900; // 4x6 ratio
  const cctx = c.getContext('2d');
  const bgImg = new Image();
  bgImg.src = 'B22_photostrip.jpg';

  bgImg.onload = async () => {
    drawImageProp(cctx, bgImg, 0, 0, c.width, c.height);
    for (let i = 0; i < photos.length; i++) {
      await new Promise(res => {
        const img = new Image();
        img.onload = () => {
          drawImageProp(cctx, img, 150, 220 + i * 280, 300, 205);
          res();
        };
        img.src = photos[i];
      });
    }
    openResult(c.toDataURL('image/png'));
  };
}

function openVideoStrip() {
  const w = window.open('', '_blank');
  w.document.write('<html><body style="margin:0;background:black;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;"><canvas id="v"></canvas><button id="d" style="margin-top:20px;padding:10px;">Download All Photos</button></body></html>');
  
  const c = w.document.getElementById('v');
  const cctx = c.getContext('2d');
  c.width = 600; c.height = 900; // 6x4 landscape

  const bgImg = new Image();
  bgImg.src = 'B22_Videostrip.jpg';
  let i = 0;

  bgImg.onload = () => {
    setInterval(() => {
      drawImageProp(cctx, bgImg, 0, 0, c.width, c.height);
      const img = new Image();
      img.onload = () => drawImageProp(cctx, img, 146, 219, 317, 195);
      img.src = photos[i];
      i = (i + 1) % photos.length;
    }, 800);
  };

  w.document.getElementById('d').onclick = () => {
    photos.forEach((src, idx) => {
      const a = document.createElement('a');
      a.href = src; a.download = `Photo_${idx+1}.png`; a.click();
    });
  };
}

function openResult(data) {
  const w = window.open();
  w.document.write(`<img src="${data}" style="width:100%">`);
}

restartBtn.onclick = () => {
  bg.src = 'B22_Opening_Page.jpg';
  video.style.display = 'none';
  resetState();
};

function resetState() {
  mode = null; filterChoice = null; photos = []; shooting = false;
}