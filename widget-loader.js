(function () {
  const WIDGET_ID = 'mijn-feedback-widget-container';
  const BACKEND_URL = 'http://38.242.144.86:3000/api/v1/feedback';

  const CURRENT_SCRIPT =
    document.currentScript || document.getElementById('widget-feedback-script');
  const CUSTOMER_ID = CURRENT_SCRIPT
    ? CURRENT_SCRIPT.getAttribute('data-customer-id')
    : null;

  if (!CUSTOMER_ID) {
    console.error(
      'Feedback widget: data-customer-id ontbreekt. ' +
        'Gebruik bijvoorbeeld: ' +
        '<script id="widget-feedback-script" src=".../widget-loader.js" data-customer-id="jouw-id" async></script>'
    );
    return;
  }
  if (document.getElementById(WIDGET_ID)) {
    console.warn('Feedback Widget is al geladen.');
    return;
  }

  /* ----------  html2canvas loader  ---------- */
  function loadHtml2Canvas() {
    return new Promise((resolve, reject) => {
      if (window.html2canvas) { resolve(window.html2canvas); return; }
      const s = document.createElement('script');
      s.src =
        'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      s.onload = () => resolve(window.html2canvas);
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  /* ----------  main initialise  ---------- */
  function initializeWidget() {
    const container = document.createElement('div');
    container.id = WIDGET_ID;
    document.body.appendChild(container);

    /* >>> NEW: kleur & dikte controls in de modal */
    container.innerHTML = `
<style>
#${WIDGET_ID}{position:fixed;right:20px;bottom:20px;z-index:10000;font-family:Arial,sans-serif}
#${WIDGET_ID} button{background-color:#3B82F6;color:white;border:none;padding:10px 15px;border-radius:5px;cursor:pointer;box-shadow:0 4px 6px rgba(0,0,0,.1);font-size:14px}
#${WIDGET_ID} button:disabled{opacity:.6;cursor:default}
#${WIDGET_ID} button:hover:not(:disabled){background-color:#2563EB}
#${WIDGET_ID} .feedback-icon-button{background:transparent;padding:0;border-radius:999px;box-shadow:none;border:none}
#${WIDGET_ID} .feedback-icon-button img{width:48px;height:48px;display:block;border-radius:999px;box-shadow:0 4px 12px rgba(0,0,0,.25)}
#${WIDGET_ID} .feedback-icon-button:hover img{transform:translateY(-1px);box-shadow:0 6px 16px rgba(0,0,0,.35)}
.feedback-modal{display:none;position:fixed;z-index:10001;left:0;top:0;width:100%;height:100%;overflow:auto;background:rgba(0,0,0,.4);padding-top:60px}
.modal-content{background:#fefefe;margin:5% auto;padding:20px;border:1px solid #888;width:80%;max-width:600px;border-radius:8px;box-shadow:0 5px 15px rgba(0,0,0,.3);position:relative;font-family:Arial,sans-serif}
.close-btn{color:#aaa;float:right;font-size:28px;font-weight:bold;cursor:pointer}
.close-btn:hover{color:#000}textarea{width:100%;min-height:100px;padding:10px;margin-top:10px;border:1px solid #ccc;box-sizing:border-box;border-radius:4px;font-family:Arial;font-size:14px}
#screenshot-btn,#send-feedback-btn{margin-top:10px;width:100%}
#screenshot-preview-wrapper{margin-top:15px;border:1px solid #ddd;border-radius:4px;padding:8px;max-height:400px;overflow:auto;display:none;background:#fafafa}
#screenshot-preview-container{position:relative;display:inline-block;max-width:100%}
#screenshot-image{max-width:100%;display:block;user-select:none;-webkit-user-select:none}
#screenshot-draw-canvas{position:absolute;left:0;top:0;cursor:crosshair;z-index:2}
.hint-text{font-size:12px;color:#555;margin-top:4px}
.tool-selector{margin-top:8px;margin-bottom:12px;display:flex;gap:8px;align-items:center;font-size:13px;color:#333;font-weight:500}
.tool-selector button{background:#e5e7eb;color:#374151;padding:6px 14px;font-size:13px;box-shadow:0 1px 2px rgba(0,0,0,.1);border-radius:6px;font-weight:500;transition:all .2s}
.tool-selector button:hover{background:#d1d5db}
.tool-selector button.active{background:#3B82F6;color:#fff;box-shadow:0 2px 4px rgba(59,130,246,.4)}
.canvas-hint{font-size:11px;color:#6b7280;margin-top:6px;padding:4px 8px;background:#f3f4f6;border-radius:4px;display:inline-block}
/* >>> NEW kleur / slider bar */
.color-size-row{display:flex;gap:12px;align-items:center;margin-bottom:8px;font-size:13px}
.color-size-row label{display:flex;align-items:center;gap:6px}
#color-picker{width:28px;height:28px;border:none;border-radius:4px;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.2)}
#size-slider{flex:1}
</style>

<button id="open-feedback-btn" class="feedback-icon-button">
  <img src="http://38.242.144.86:8088/widget/icon.png" alt="Feedback">
</button>

<div id="feedback-modal" class="feedback-modal" data-html2canvas-ignore="true">
  <div class="modal-content">
    <span class="close-btn">&times;</span>
    <h2>Geef je Feedback</h2>
    <p>Beschrijf het probleem of suggestie. Je kunt optioneel een screenshot maken en daarop tekenen.</p>

    <textarea id="feedback-text" placeholder="Typ hier je opmerking..."></textarea>

    <button id="screenshot-btn" type="button">📸 Maak screenshot van pagina</button>
    <div class="hint-text">De screenshot bevat de pagina zonder dit venster.</div>

    <div id="screenshot-preview-wrapper">
      <!-- >>> NEW kleur/dikte balk -->
      <div class="color-size-row">
        <label>Kleur:
          <input type="color" id="color-picker" value="#ff0000">
        </label>
        <label>Dikte:
          <input type="range" id="size-slider" min="1" max="40" value="3">
          <span id="size-value">3</span>px
        </label>
      </div>

      <div class="tool-selector">
        <span>✏️ Teken gereedschap:</span>
        <button id="tool-pencil" type="button" class="active">✏️ Potlood</button>
        <button id="tool-eraser" type="button">🧹 Gum</button>
      </div>
      <div class="hint-text">
        Klik en sleep om te tekenen op de screenshot. Gebruik de gum om tekeningen te verwijderen.
      </div>
      <div id="screenshot-preview-container">
        <img id="screenshot-image" alt="Screenshot preview">
        <canvas id="screenshot-draw-canvas"></canvas>
      </div>
      <div class="canvas-hint">💡 Tip: Sleep met je muis over de screenshot om te tekenen</div>
    </div>

    <button id="send-feedback-btn" type="button">📤 Verstuur Feedback</button>
  </div>
</div>
`;

    /* ----------  DOM refs  ---------- */
    const openBtn = document.getElementById('open-feedback-btn');
    const modal = document.getElementById('feedback-modal');
    const closeBtn = document.querySelector('.close-btn');
    const sendBtn = document.getElementById('send-feedback-btn');
    const feedbackTextarea = document.getElementById('feedback-text');

    const screenshotBtn = document.getElementById('screenshot-btn');
    const screenshotWrapper = document.getElementById('screenshot-preview-wrapper');
    const screenshotImg = document.getElementById('screenshot-image');
    const drawCanvas = document.getElementById('screenshot-draw-canvas');

    const toolPencilBtn = document.getElementById('tool-pencil');
    const toolEraserBtn = document.getElementById('tool-eraser');

    /* >>> NEW */
    const colorPicker = document.getElementById('color-picker');
    const sizeSlider = document.getElementById('size-slider');
    const sizeValue = document.getElementById('size-value');

    let currentTool = 'pencil';
    let baseScreenshotDataUrl = null;
    let finalScreenshotDataUrl = null;
    let drawingInitialized = false;

    /* >>> NEW: lijndikte aan slider koppelen */
    sizeSlider.addEventListener('input', e => {
      sizeValue.textContent = e.target.value;
    });

    /* popup open/close */
    openBtn.onclick = () => { modal.style.display = 'block'; };
    closeBtn.onclick = () => { modal.style.display = 'none'; };
    window.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });

    function resetModal() {
      feedbackTextarea.value = '';
      modal.style.display = 'none';
      baseScreenshotDataUrl = null;
      finalScreenshotDataUrl = null;
      screenshotWrapper.style.display = 'none';
      drawingInitialized = false;
      const ctx = drawCanvas.getContext('2d');
      ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    }

    /* tool switch */
    function setTool(tool) {
      currentTool = tool;
      toolPencilBtn.classList.toggle('active', tool === 'pencil');
      toolEraserBtn.classList.toggle('active', tool === 'eraser');
      drawCanvas.style.cursor = tool === 'pencil' ? 'crosshair' : 'grab';
    }
    toolPencilBtn.addEventListener('click', () => setTool('pencil'));
    toolEraserBtn.addEventListener('click', () => setTool('eraser'));

    /* ----------  tekenlogica  ---------- */
    function setupDrawing() {
      if (drawingInitialized) return;
      drawingInitialized = true;

      const ctx = drawCanvas.getContext('2d', { willReadFrequently: true });
      let drawing = false;
      let lastX = 0, lastY = 0;

      function getPos(e) {
        const rect = drawCanvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
      }
      function start(e) {
        e.preventDefault();
        drawing = true;
        const pos = getPos(e);
        lastX = pos.x; lastY = pos.y;
      }
      function move(e) {
        if (!drawing) return;
        e.preventDefault();
        const pos = getPos(e);

        ctx.lineCap = 'round'; ctx.lineJoin = 'round';

        if (currentTool === 'pencil') {
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = colorPicker.value;   // >>> NEW
          ctx.lineWidth = parseInt(sizeSlider.value, 10);
        } else {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.lineWidth = parseInt(sizeSlider.value, 10);
        }
        ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(pos.x, pos.y); ctx.stroke();
        lastX = pos.x; lastY = pos.y;
      }
      function stop(e) {
        if (e) e.preventDefault();
        drawing = false;
      }

      /* mouse */
      drawCanvas.addEventListener('mousedown', start);
      drawCanvas.addEventListener('mousemove', move);
      drawCanvas.addEventListener('mouseup', stop);
      drawCanvas.addEventListener('mouseleave', stop);
      /* touch */
      drawCanvas.addEventListener('touchstart', start, { passive: false });
      drawCanvas.addEventListener('touchmove', move, { passive: false });
      drawCanvas.addEventListener('touchend', stop, { passive: false });
    }

    /* ----------  screenshot maken  ---------- */
    async function makeScreenshot() {
      try {
        const html2canvas = await loadHtml2Canvas();
        const canvas = await html2canvas(document.body, { scale: .7, logging: false, useCORS: true });
        baseScreenshotDataUrl = canvas.toDataURL('image/png');
        screenshotWrapper.style.display = 'block';
        screenshotImg.src = baseScreenshotDataUrl;
        screenshotImg.onload = () => {
          requestAnimationFrame(() => {
            const w = screenshotImg.clientWidth, h = screenshotImg.clientHeight;
            drawCanvas.width = w; drawCanvas.height = h;
            drawCanvas.style.width = w + 'px'; drawCanvas.style.height = h + 'px';
            const ctx = drawCanvas.getContext('2d');
            ctx.clearRect(0, 0, w, h);
            setupDrawing();
          });
        };
      } catch (err) {
        console.error(err);
        alert('Kon geen screenshot maken: ' + err.message);
        baseScreenshotDataUrl = null;
      }
    }

    /* ----------  merge + versturen  ---------- */
    function mergeScreenshotAndDrawing() {
      if (!baseScreenshotDataUrl) return Promise.resolve(null);
      return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
          const fin = document.createElement('canvas');
          fin.width = img.width; fin.height = img.height;
          const fx = fin.getContext('2d');
          fx.drawImage(img, 0, 0);
          if (drawCanvas.width > 0 && drawCanvas.height > 0) {
            fx.drawImage(drawCanvas, 0, 0, img.width, img.height);
          }
          resolve(fin.toDataURL('image/png'));
        };
        img.src = baseScreenshotDataUrl;
      });
    }

    screenshotBtn.addEventListener('click', async () => {
      screenshotBtn.disabled = true; screenshotBtn.textContent = '📸 Screenshot maken...';
      await makeScreenshot();
      screenshotBtn.disabled = false; screenshotBtn.textContent = '📸 Maak screenshot van pagina';
    });

    sendBtn.addEventListener('click', async () => {
      const text = feedbackTextarea.value.trim();
      if (!text) { alert('Voer eerst een bericht in.'); return; }
      finalScreenshotDataUrl = baseScreenshotDataUrl ? await mergeScreenshotAndDrawing() : null;

      const payload = {
        message: text,
        screenshot: finalScreenshotDataUrl,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        customerId: CUSTOMER_ID
      };
      try {
        sendBtn.disabled = true; sendBtn.textContent = '📤 Versturen...';
        const res = await fetch(BACKEND_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (res.status === 201) { alert('Bedankt! Feedback succesvol ontvangen.'); resetModal(); }
        else { const er = await res.json().catch(() => ({})); alert(`Fout (${res.status}): ${er.msg || 'Serverfout'}`); }
      } catch (e) {
        console.error(e); alert('Kon geen verbinding maken met de feedbackserver.');
      } finally { sendBtn.disabled = false; sendBtn.textContent = '📤 Verstuur Feedback'; }
    });
  }

  initializeWidget();
})();
