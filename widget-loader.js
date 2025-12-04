(function() {
    // --- Configuratie ---
    const WIDGET_ID = 'mijn-feedback-widget-container';

    const BACKEND_URL = 'http://38.242.144.86:3000/api/v1/feedback';

    // Haal de customerId uit de <script> tag
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

        // Basis HTML/CSS voor de widget
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
                textarea {
                  width: 100%;
                  min-height: 100px;
                  padding: 10px;
                  margin-top: 10px;
                  border: 1px solid #ccc;
                  box-sizing: border-box;
                  border-radius: 4px;
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
                  max-height: 350px;
                  overflow: auto;
                  display: none;
                }
                #screenshot-preview-container {
                  position: relative;
                  display: inline-block;
                  max-width: 100%;
                }
                #screenshot-image {
                  max-width: 100%;
                  display: block;
                }
                #screenshot-draw-canvas {
                  position: absolute;
                  left: 0;
                  top: 0;
                  cursor: crosshair;
                }
                .hint-text {
                  font-size: 12px;
                  color: #555;
                  margin-top: 4px;
                }
              </style>
            
              <button id="open-feedback-btn">Geef Feedback</button>
            
              <!-- Let op data-html2canvas-ignore -->
              <div id="feedback-modal" class="feedback-modal" data-html2canvas-ignore="true">
                <div class="modal-content">
                  <span class="close-btn">&times;</span>
                  <h2>Geef je Feedback</h2>
                  <p>Beschrijf het probleem of suggestie. Je kunt optioneel een screenshot maken en daarop tekenen.</p>
            
                  <textarea id="feedback-text" placeholder="Typ hier je opmerking..."></textarea>
            
                  <button id="screenshot-btn" type="button">Maak screenshot van pagina</button>
                  <div class="hint-text">De screenshot bevat de pagina zonder dit venster.</div>
            
                  <div id="screenshot-preview-wrapper">
                    <div class="hint-text">Teken op de screenshot om extra aan te geven wat belangrijk is.</div>
                    <div id="screenshot-preview-container">
                      <img id="screenshot-image" alt="Screenshot preview" />
                      <canvas id="screenshot-draw-canvas"></canvas>
                    </div>
                  </div>
            
                  <button id="send-feedback-btn" type="button">Verstuur Feedback</button>
                </div>
              </div>
        `;
        const openBtn = document.getElementById('open-feedback-btn');
        const modal = document.getElementById('feedback-modal');
        const closeBtn = document.querySelector('.close-btn');
        const sendBtn = document.getElementById('send-feedback-btn');
        const feedbackTextarea = document.getElementById('feedback-text');

        openBtn.onclick = () => {
            modal.style.display = 'block';
        };

        closeBtn.onclick = () => {
            modal.style.display = 'none';
        };

        window.onclick = (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        };

        function resetModal() {
            feedbackTextarea.value = '';
            modal.style.display = 'none';
        }

        sendBtn.addEventListener('click', async () => {
            const feedbackText = feedbackTextarea.value.trim();
            if (!feedbackText) {
                alert('Voer eerst een bericht in.');
                return;
            }

            // 1. Maak de screenshot
            let screenshotDataUrl = null;
            try {
                const html2canvas = await loadHtml2Canvas();
                const canvas = await html2canvas(document.body, { 
                    scale: 0.5,
                    logging: false 
                });
                screenshotDataUrl = canvas.toDataURL('image/png'); 
            } catch (err) {
                console.error('Fout bij het maken van de screenshot:', err);
                alert('Kon geen screenshot maken. Feedback wordt zonder afbeelding verstuurd.');
                screenshotDataUrl = null; 
            }

            // 2. Bereid de payload voor
            const payload = {
                message: feedbackText,
                screenshot: screenshotDataUrl,
                url: window.location.href,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString(),
                customerId: CUSTOMER_ID
            };

            // 3. API Call naar de Node.js Backend
            try {
                sendBtn.disabled = true;
                sendBtn.textContent = 'Versturen...';

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
                alert('Fout: Kon geen verbinding maken met de feedbackserver. Controleer de API-URL en CORS.');
            } finally {
                sendBtn.disabled = false;
                sendBtn.textContent = 'Verstuur Feedback';
            }
        });
    }

    // Start de initialisatie
    initializeWidget();

})();

