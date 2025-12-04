(function() {
    const WIDGET_ID = 'mijn-feedback-widget-container';
    const BACKEND_URL = 'http://38.242.144.86:3000/api/v1/feedback';

    const CURRENT_SCRIPT = document.currentScript
        || document.getElementById('widget-feedback-script');

    const CUSTOMER_ID = CURRENT_SCRIPT
        ? CURRENT_SCRIPT.getAttribute('data-customer-id')
        : null;

    if (!CUSTOMER_ID) {
        console.error(
            'Feedback widget: data-customer-id ontbreekt. ' +
            'Gebruik bijvoorbeeld: ' +
            "<script id=\"widget-feedback-script\" src=\".../widget-loader.js\" data-customer-id=\"jouw-id\" async></script>"
        );
        return;
    }
    if (document.getElementById(WIDGET_ID)) {
        console.warn('Feedback Widget is al geladen.');
        return;
    }

    function loadHtml2Canvas() {
        return new Promise((resolve, reject) => {
            if (window.html2canvas) {
                resolve(window.html2canvas);
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            script.onload = () => resolve(window.html2canvas);
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // --- Core Widget Logica ---
    function initializeWidget() {
        const widgetContainer = document.createElement('div');
        widgetContainer.id = WIDGET_ID;
        document.body.appendChild(widgetContainer);

        // UI + styles
        widgetContainer.innerHTML = `
            <style>
                #${WIDGET_ID} {
                    position: fixed;
                    right: 20px;
                    bottom: 20px;
                    z-index: 10000;
                    font-family: Arial, sans-serif;
                }
                #${WIDGET_ID} button {
                    background-color: #3B82F6;
                    color: white;
                    border: none;
                    padding: 10px 15px;
                    border-radius: 5px;
                    cursor: pointer;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    font-size: 14px;
                }
                #${WIDGET_ID} button:disabled {
                    opacity: 0.6;
                    cursor: default;
                }
                #${WIDGET_ID} button:hover:not(:disabled) {
                    background-color: #2563EB;
                }
                .feedback-modal {
                    display: none;
                    position: fixed;
                    z-index: 10001;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    overflow: auto;
                    background-color: rgba(0,0,0,0.4);
                    padding-top: 60px;
                }
                .modal-content {
                    background-color: #fefefe;
                    margin: 5% auto;
                    padding: 20px;
                    border: 1px solid #888;
                    width: 80%;
                    max-width: 600px;
                    border-radius: 8px;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                    position: relative;
                    font-family: Arial, sans-serif;
                }
                .close-btn {
                    color: #aaa;
                    float: right;
                    font-size: 28px;
                    font-weight: bold;
                    cursor: pointer;
                }
                .close-btn:hover {
                    color: #000;
                }
                textarea {
                    width: 100%;
                    min-height: 100px;
                    padding: 10px;
                    margin-top: 10px;
                    border: 1px solid #ccc;
                    box-sizing: border-box;
                    border-radius: 4px;
                    font-family: Arial, sans-serif;
                    font-size: 14px;
                }
                #screenshot-btn,
                #send-feedback-btn {
                    margin-top: 10px;
                    width: 100%;
                }
                #screenshot-preview-wrapper {
                    margin-top: 15px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    padding: 8px;
                    max-height: 400px;
                    overflow: auto;
                    display: none;
                    background: #fafafa;
                }
                #screenshot-preview-container {
                    position: relative;
                    display: inline-block;
                    max-width: 100%;
                }
                #screenshot-image {
                    max-width: 100%;
                    display: block;
                    user-select: none;
                    -webkit-user-select: none;
                }
                #screenshot-draw-canvas {
                    position: absolute;
                    left: 0;
                    top: 0;
                    cursor: crosshair;
                    z-index: 2;
                }
                .hint-text {
                    font-size: 12px;
                    color: #555;
                    margin-top: 4px;
                }
                .tool-selector {
                    margin-top: 8px;
                    margin-bottom: 12px;
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    font-size: 13px;
                    color: #333;
                    font-weight: 500;
                }
                .tool-selector button {
                    background-color: #e5e7eb;
                    color: #374151;
                    padding: 6px 14px;
                    font-size: 13px;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                    border-radius: 6px;
                    font-weight: 500;
                    transition: all 0.2s;
                }
                .tool-selector button:hover {
                    background-color: #d1d5db;
                }
                .tool-selector button.active {
                    background-color: #3B82F6;
                    color: #ffffff;
                    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.4);
                }
                .canvas-hint {
                    font-size: 11px;
                    color: #6b7280;
                    margin-top: 6px;
                    padding: 4px 8px;
                    background: #f3f4f6;
                    border-radius: 4px;
                    display: inline-block;
                }
            </style>

            <button id="open-feedback-btn">Geef Feedback</button>

            <!-- Popup wordt uitgesloten van screenshot -->
            <div id="feedback-modal" class="feedback-modal" data-html2canvas-ignore="true">
                <div class="modal-content">
                    <span class="close-btn">&times;</span>
                    <h2>Geef je Feedback</h2>
                    <p>Beschrijf het probleem of suggestie. Je kunt optioneel een screenshot maken en daarop tekenen.</p>

                    <textarea id="feedback-text" placeholder="Typ hier je opmerking..."></textarea>

                    <button id="screenshot-btn" type="button">📸 Maak screenshot van pagina</button>
                    <div class="hint-text">De screenshot bevat de pagina zonder dit venster.</div>

                    <div id="screenshot-preview-wrapper">
                        <div class="tool-selector">
                            <span>✏️ Teken gereedschap:</span>
                            <button id="tool-pencil" type="button" class="active">✏️ Potlood</button>
                            <button id="tool-eraser" type="button">🧹 Gum</button>
                        </div>
                        <div class="hint-text">
                            Klik en sleep om te tekenen op de screenshot. Gebruik de gum om tekeningen te verwijderen.
                        </div>
                        <div id="screenshot-preview-container">
                            <img id="screenshot-image" alt="Screenshot preview" />
                            <canvas id="screenshot-draw-canvas"></canvas>
                        </div>
                        <div class="canvas-hint">💡 Tip: Sleep met je muis over de screenshot om te tekenen</div>
                    </div>

                    <button id="send-feedback-btn" type="button">📤 Verstuur Feedback</button>
                </div>
            </div>
        `;

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

        let currentTool = 'pencil';
        let baseScreenshotDataUrl = null;
        let finalScreenshotDataUrl = null;
        let drawingInitialized = false;

        // popup open/close
        openBtn.onclick = () => {
            modal.style.display = 'block';
        };

        closeBtn.onclick = () => {
            modal.style.display = 'none';
        };

        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });

        function resetModal() {
            feedbackTextarea.value = '';
            modal.style.display = 'none';
            baseScreenshotDataUrl = null;
            finalScreenshotDataUrl = null;
            screenshotWrapper.style.display = 'none';
            drawingInitialized = false;
            if (drawCanvas) {
                const ctx = drawCanvas.getContext('2d');
                ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
            }
        }

        // tool switch
        function setTool(tool) {
            currentTool = tool;
            console.log('Tool geselecteerd:', tool);
            
            if (tool === 'pencil') {
                toolPencilBtn.classList.add('active');
                toolEraserBtn.classList.remove('active');
                drawCanvas.style.cursor = 'crosshair';
            } else {
                toolEraserBtn.classList.add('active');
                toolPencilBtn.classList.remove('active');
                drawCanvas.style.cursor = 'grab';
            }
        }

        toolPencilBtn.addEventListener('click', () => {
            setTool('pencil');
        });
        
        toolEraserBtn.addEventListener('click', () => {
            setTool('eraser');
        });

        // Tekenen op de canvas
        function setupDrawing() {
            if (drawingInitialized) {
                console.log('Tekenen al geïnitialiseerd');
                return;
            }
            
            drawingInitialized = true;
            console.log('Tekenen initialiseren...');

            const ctx = drawCanvas.getContext('2d', { willReadFrequently: true });
            let drawing = false;
            let lastX = 0;
            let lastY = 0;

            function getPos(e) {
                const rect = drawCanvas.getBoundingClientRect();
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                const x = clientX - rect.left;
                const y = clientY - rect.top;
                return { x, y };
            }

            function startDrawing(e) {
                e.preventDefault();
                drawing = true;
                const pos = getPos(e);
                lastX = pos.x;
                lastY = pos.y;
                console.log('Start tekenen op:', pos);
            }

            function draw(e) {
                if (!drawing) return;
                e.preventDefault();
                
                const pos = getPos(e);

                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                if (currentTool === 'pencil') {
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.strokeStyle = '#ff0000';
                    ctx.lineWidth = 3;
                } else if (currentTool === 'eraser') {
                    ctx.globalCompositeOperation = 'destination-out';
                    ctx.strokeStyle = 'rgba(0,0,0,1)';
                    ctx.lineWidth = 20;
                }

                ctx.beginPath();
                ctx.moveTo(lastX, lastY);
                ctx.lineTo(pos.x, pos.y);
                ctx.stroke();

                lastX = pos.x;
                lastY = pos.y;
            }

            function stopDrawing(e) {
                if (e) e.preventDefault();
                if (drawing) {
                    console.log('Stop tekenen');
                }
                drawing = false;
            }

            // Mouse events
            drawCanvas.addEventListener('mousedown', startDrawing);
            drawCanvas.addEventListener('mousemove', draw);
            drawCanvas.addEventListener('mouseup', stopDrawing);
            drawCanvas.addEventListener('mouseleave', stopDrawing);

            // Touch events
            drawCanvas.addEventListener('touchstart', startDrawing, { passive: false });
            drawCanvas.addEventListener('touchmove', draw, { passive: false });
            drawCanvas.addEventListener('touchend', stopDrawing, { passive: false });

            console.log('Tekenen geïnitialiseerd! Canvas grootte:', drawCanvas.width, 'x', drawCanvas.height);
        }

        // Screenshot maken
        async function makeScreenshot() {
            try {
                const html2canvas = await loadHtml2Canvas();
                const canvas = await html2canvas(document.body, {
                    scale: 0.7,
                    logging: false,
                    useCORS: true
                });
                baseScreenshotDataUrl = canvas.toDataURL('image/png');

                screenshotWrapper.style.display = 'block';
                
                screenshotImg.src = baseScreenshotDataUrl;
                screenshotImg.onload = () => {
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            const displayWidth = screenshotImg.clientWidth;
                            const displayHeight = screenshotImg.clientHeight;
                            
                            console.log('Afbeelding geladen. Display grootte:', displayWidth, 'x', displayHeight);
                            console.log('Natuurlijke grootte:', screenshotImg.naturalWidth, 'x', screenshotImg.naturalHeight);
                            
                            // Zet canvas exact over de afbeelding
                            drawCanvas.width = displayWidth;
                            drawCanvas.height = displayHeight;
                            drawCanvas.style.width = displayWidth + 'px';
                            drawCanvas.style.height = displayHeight + 'px';
                            
                            // Clear canvas
                            const ctx = drawCanvas.getContext('2d');
                            ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
                            
                            // Initialiseer tekenen
                            setupDrawing();
                            
                            console.log('Canvas ingesteld op:', drawCanvas.width, 'x', drawCanvas.height);
                        });
                    });
                };
            } catch (err) {
                console.error('Fout bij het maken van de screenshot:', err);
                alert('Kon geen screenshot maken: ' + err.message);
                baseScreenshotDataUrl = null;
            }
        }

        // Screenshot + tekeningen samenvoegen
        function mergeScreenshotAndDrawing() {
            if (!baseScreenshotDataUrl) return Promise.resolve(null);

            const img = new Image();
            return new Promise((resolve) => {
                img.onload = () => {
                    const finalCanvas = document.createElement('canvas');
                    finalCanvas.width = img.width;
                    finalCanvas.height = img.height;
                    const ctx = finalCanvas.getContext('2d');

                    // Basis screenshot
                    ctx.drawImage(img, 0, 0);

                    // Tekenlaag eroverheen (schalen naar originele grootte)
                    if (drawCanvas.width > 0 && drawCanvas.height > 0) {
                        ctx.drawImage(drawCanvas, 0, 0, img.width, img.height);
                    }

                    resolve(finalCanvas.toDataURL('image/png'));
                };
                img.src = baseScreenshotDataUrl;
            });
        }

        // Knop: maak screenshot
        screenshotBtn.addEventListener('click', async () => {
            screenshotBtn.disabled = true;
            screenshotBtn.textContent = '📸 Screenshot maken...';
            await makeScreenshot();
            screenshotBtn.disabled = false;
            screenshotBtn.textContent = '📸 Maak screenshot van pagina';
        });

        // Knop: verstuur feedback
        sendBtn.addEventListener('click', async () => {
            const feedbackText = feedbackTextarea.value.trim();
            if (!feedbackText) {
                alert('Voer eerst een bericht in.');
                return;
            }

            if (baseScreenshotDataUrl) {
                finalScreenshotDataUrl = await mergeScreenshotAndDrawing();
            } else {
                finalScreenshotDataUrl = null;
            }

            const payload = {
                message: feedbackText,
                screenshot: finalScreenshotDataUrl,
                url: window.location.href,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString(),
                customerId: CUSTOMER_ID
            };

            try {
                sendBtn.disabled = true;
                sendBtn.textContent = '📤 Versturen...';

                const response = await fetch(BACKEND_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (response.status === 201) {
                    alert('Bedankt! Feedback succesvol ontvangen door de server.');
                    resetModal();
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    alert(`Fout bij verzenden (${response.status}): ${errorData.msg || 'Serverfout'}`);
                }
            } catch (error) {
                console.error('Netwerkfout bij verzenden:', error);
                alert('Fout: Kon geen verbinding maken met de feedbackserver.');
            } finally {
                sendBtn.disabled = false;
                sendBtn.textContent = '📤 Verstuur Feedback';
            }
        });
    }

    // Start de widget
    initializeWidget();
})();
