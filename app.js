const scanBtn = document.getElementById('scanBtn');
const video = document.getElementById('video');
const list = document.getElementById('list');
const toast = document.getElementById('toast');

let stream = null;
let scanning = false;
let detector = null;

// Database interno prodotti casa
const customProducts = [
  { code: "8001234567890", name: "Sacchetti gelo", image: null },
  { code: "8009876543210", name: "Alcool denaturato", image: null },
  { code: "8011111111111", name: "Pellicola trasparente", image: null },
  { code: "8022222222222", name: "Carta forno", image: null },
  { code: "8033333333333", name: "Spugne cucina", image: null },
  { code: "8044444444444", name: "Detersivo piatti", image: null }
];

// Lista salvata
let items = JSON.parse(localStorage.getItem("listaSpesa") || "[]");
renderList();

function saveList() {
  localStorage.setItem("listaSpesa", JSON.stringify(items));
}

function showToast(text) {
  toast.textContent = text;
  toast.style.opacity = 1;
  setTimeout(() => toast.style.opacity = 0, 2000);
}

async function initDetector() {
  if (!('BarcodeDetector' in window)) {
    alert("Il tuo browser non supporta BarcodeDetector. Usa Chrome.");
    return null;
  }
  return new BarcodeDetector({
    formats: ['ean_13','ean_8','upc_a','upc_e','code_128']
  });
}

async function startCamera() {
  stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: 'environment',
      width: { ideal: 640 },
      height: { ideal: 480 }
    }
  });

  video.srcObject = stream;

  video.setAttribute("playsinline", true);
  video.setAttribute("webkit-playsinline", true);

  await new Promise(resolve => {
    video.onloadedmetadata = () => resolve();
  });

  await video.play();
}

function stopCamera() {
  if (stream) stream.getTracks().forEach(t => t.stop());
  scanning = false;
}

function renderList() {
  list.innerHTML = items.map(i =>
    `<div class="item">
       <span>
         <strong>${i.name || 'Prodotto'}</strong><br>
         <span class="code">${i.code}</span>
       </span>
       ${i.image ? `<img src="${i.image}">` : ""}
       <button onclick="removeItem('${i.code}')">✕</button>
     </div>`
  ).join('');
}

window.removeItem = code => {
  items = items.filter(i => i.code !== code);
  saveList();
  renderList();
};

function findCustomProduct(code) {
  return customProducts.find(p => p.code === code) || null;
}

async function fetchProductDetails(code) {
  // 1) Database interno
  const local = findCustomProduct(code);
  if (local) {
    return {
      name: local.name,
      image: local.image
    };
  }

  // 2) OpenFoodFacts (alimentari)
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
    const data = await res.json();

    if (data.status === 1) {
      return {
        name: data.product.product_name || "Prodotto",
        image: data.product.image_small_url || null
      };
    }
  } catch (e) {
    console.error("Errore API:", e);
  }

  // 3) Non trovato → chiedi nome
  const name = prompt("Nome del prodotto?");
  return { name: name || "Prodotto", image: null };
}

async function scanLoop() {
  if (!scanning || !detector) return;

  try {
    const barcodes = await detector.detect(video);

    if (barcodes.length > 0) {
      const code = barcodes[0].rawValue;

      if (!items.find(i => i.code === code)) {
        const details = await fetchProductDetails(code);

        items.push({
          code,
          name: details.name,
          image: details.image
        });

        saveList();
        renderList();
        showToast(`${details.name} aggiunto`);
        navigator.vibrate?.(100);
      }
    }
  } catch (e) {
    console.error("Errore detector:", e);
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