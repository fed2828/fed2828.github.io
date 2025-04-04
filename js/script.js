document.addEventListener("DOMContentLoaded", () => {
  // ======== Sezione ORDERS.HTML ========
  const fileUpload = document.getElementById("fileUpload");
  const calculatePriceBtn = document.getElementById("calculatePriceBtn");
  const calculatedVolumeDiv = document.getElementById("calculatedVolume");
  const calculatedPriceDiv = document.getElementById("calculatedPrice");
  const submitOrderBtn = document.getElementById("submitOrderBtn");

  const materialCosts = {
    "PLA_BASIC": 19.32,
    "PLA_METAL": 23.52,
    "RESINA_STD": 0.25
  };
  const density = {
    "PLA_BASIC": 1.24,
    "PLA_METAL": 1.25,
    "RESINA_STD": 1.20
  };

  if (calculatePriceBtn) {
    calculatePriceBtn.addEventListener("click", async () => {
      const file = fileUpload.files[0];
      if (!file) {
        alert("Seleziona prima un file STL!");
        return;
      }

      try {
        const volumeMM3 = await parseSTLVolume(file);
        const volumeCM3 = volumeMM3 / 1000;

        calculatedVolumeDiv.textContent = `Volume: ${volumeCM3.toFixed(2)} cm³`;

        const material = document.getElementById("materialSelect").value;
        const quantity = parseInt(document.getElementById("quantity").value) || 1;
        const costPerCM3 = materialCosts[material] / (density[material] * 1000);
        let totalCost = volumeCM3 * costPerCM3 * quantity;

        const setupFee = 10.00;
        totalCost += setupFee;

        calculatedPriceDiv.textContent = `Prezzo stimato: €${totalCost.toFixed(2)}`;

        // 🔥 Mostra il bottone di invio solo dopo il calcolo
        /*
        if (submitOrderBtn) {
          submitOrderBtn.style.display = "inline-block";
        }
        */
      } catch (err) {
        console.error(err);
        alert("Errore durante l'analisi del file STL: " + err.message);
      }
    });
  }

  async function parseSTLVolume(file) {
    const arrayBuffer = await file.arrayBuffer();
    return isBinarySTL(arrayBuffer)
      ? parseBinarySTL(arrayBuffer)
      : parseASCIISTL(new TextDecoder().decode(arrayBuffer));
  }

  function isBinarySTL(arrayBuffer) {
    if (arrayBuffer.byteLength < 84) return false;
    const view = new DataView(arrayBuffer);
    const nFaces = view.getUint32(80, true);
    return (84 + nFaces * 50 === arrayBuffer.byteLength);
  }

  function parseBinarySTL(buffer) {
    const view = new DataView(buffer);
    let offset = 84;
    let totalVolume = 0;
    const readVec = (o) => [
      view.getFloat32(o, true),
      view.getFloat32(o + 4, true),
      view.getFloat32(o + 8, true)
    ];

    const nFaces = view.getUint32(80, true);
    for (let i = 0; i < nFaces; i++) {
      const v1 = readVec(offset + 12);
      const v2 = readVec(offset + 24);
      const v3 = readVec(offset + 36);
      totalVolume += triangleVolume(v1, v2, v3);
      offset += 50;
    }
    return Math.abs(totalVolume);
  }

  function parseASCIISTL(text) {
    const regex = /vertex\s+([-\d.eE]+)\s+([-\d.eE]+)\s+([-\d.eE]+)/g;
    const vertices = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      vertices.push(match.slice(1, 4).map(Number));
    }

    let totalVolume = 0;
    for (let i = 0; i < vertices.length; i += 3) {
      totalVolume += triangleVolume(vertices[i], vertices[i + 1], vertices[i + 2]);
    }
    return Math.abs(totalVolume);
  }

  function triangleVolume(v1, v2, v3) {
    const ax = v2[0] - v1[0], ay = v2[1] - v1[1], az = v2[2] - v1[2];
    const bx = v3[0] - v1[0], by = v3[1] - v1[1], bz = v3[2] - v1[2];
    const cx = ay * bz - az * by;
    const cy = az * bx - ax * bz;
    const cz = ax * by - ay * bx;
    return (v1[0] * cx + v1[1] * cy + v1[2] * cz) / 6.0;
  }

  // ======== Sezione PRODUCT-DETAIL.HTML ========
  const detailContainer = document.getElementById("productDetail");
  if (detailContainer) {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get("id");

    const products = {
      "1": {
        name: "Miniatura Resina",
        price: "€10,00",
        image: "images/resina.jpg",
        description: "Miniatura dettagliata stampata in resina ad alta definizione.",
        printerIcon: "images/resina-icon.png",
        printerType: "Resina",
        material: "Resina standard - 20g"
      },
      "2": {
        name: "Supporto FDM",
        price: "€12,50",
        image: "images/fdm.jpg",
        description: "Supporto resistente stampato in FDM con PLA.",
        printerIcon: "images/fdm-icon.png",
        printerType: "FDM",
        material: "PLA - 80g"
      }
    };

    const product = products[productId];
    if (!product) {
      detailContainer.innerHTML = "<p>Prodotto non trovato.</p>";
      return;
    }

    detailContainer.innerHTML = `
      <div class="product-detail-container">
        <img src="${product.image}" alt="${product.name}">
        <div class="detail-text">
          <h1>${product.name}</h1>
          <p class="price">${product.price}</p>
          <div class="printer-info">
            <img src="${product.printerIcon}" alt="${product.printerType}" title="${product.printerType}">
            <span>${product.printerType}</span>
          </div>
          <p class="material">${product.material}</p>
        </div>
      </div>
      <div class="description">
        <p>${product.description}</p>
      </div>
    `;
  }
});
