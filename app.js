const scanBtn = document.getElementById('scanBtn');
const video = document.getElementById('video');
const list = document.getElementById('list');

let stream = null;
let scanning = false;
let detector = null;

// Carica lista salvata
let items = JSON.parse(localStorage.getItem("listaSpesa") || "[]");
renderList();

function saveList() {
  localStorage.setItem("listaSpesa", JSON.stringify(items));
}

async function initDetector() {
  if (!('BarcodeDetector' in window)) {
    alert("Il browser non supporta BarcodeDetector. Usa Chrome.");
    return null;
  }
  return new BarcodeDetector({
    formats: ['ean_13','ean_8','upc_a','upc_e','code_128']
  });
}

async function startCamera() {
  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment' }
  });
  video.srcObject = stream;
}

function stopCamera() {
  if (stream) stream.getTracks().forEach(t => t.stop());
  scanning = false;
}

function renderList() {
  list.innerHTML = items.map(i =>
    `<div class="item">
       <span>${i.name || 'Prodotto'}<br><span class="code">${i.code}</span></span>
       <button onclick="removeItem('${i.code}')">✕</button>
     </div>`
  ).join('');
}

window.removeItem = code => {
  items = items.filter(i => i.code !== code);
  saveList();
  renderList();
};

async function scanLoop() {
  if (!scanning || !detector) return;
  const barcodes = await detector.detect(video);
  if (barcodes.length > 0) {
    const code = barcodes[0].rawValue;
    if (!items.find(i => i.code === code)) {
      items.push({ code, name:'' });
      saveList();
      renderList();
      navigator.vibrate?.(100);
    }
  }
  requestAnimationFrame(scanLoop);
}

scanBtn.addEventListener('click', async () => {
  if (scanning) {
    stopCamera();
    scanBtn.textContent = "Scansiona codice";
    return;
  }
  detector = await initDetector();
  if (!detector) return;
  await startCamera();
  scanning = true;
  scanBtn.textContent = "Ferma scansione";
  scanLoop();
});