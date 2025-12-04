const express = require('express');
const router = express.Router();
const Feedback = require('../models/feedback');

// Nodige modules voor bestandsopslag
const fs = require('fs');
const path = require('path');

// Pad waar afbeeldingen worden opgeslagen (moet overeenkomen met Stap 1)
const UPLOAD_DIR = path.join(__dirname, '../../feedback-images'); 
// Bepaalt het publieke pad, hier gebruiken we de VPS URL
const PUBLIC_URL_BASE = 'http://38.242.144.86:8088/feedback-images/'; 

// Functie om Base64 data om te zetten in een bestand
function saveBase64Image(base64Data, filename) {
    return new Promise((resolve, reject) => {
        // 1. Verwijder de Base64 metadata prefix (bijv. 'data:image/png;base64,')
        const base64Image = base64Data.split(';base64,').pop();
        
        // 2. Maak het volledige pad aan
        const filePath = path.join(UPLOAD_DIR, filename);

        // 3. Schrijf het bestand synchroon weg (simpelste methode)
        fs.writeFile(filePath, base64Image, { encoding: 'base64' }, (err) => {
            if (err) {
                return reject(err);
            }
            // 4. Los de publieke URL op
            const publicUrl = PUBLIC_URL_BASE + filename;
            resolve(publicUrl);
        });
    });
}

// POST /api/v1/feedback
router.post('/', async (req, res) => {
    // NIEUW: Destructure customerId uit de body
    const { message, screenshot, url, userAgent, customerId } = req.body; 

    // Basisvalidatie: customerId nu verplicht!
    if (!message || !url || !customerId) { 
        return res.status(400).json({ msg: 'Bericht, URL en Klant ID zijn verplicht.' });
    }

    let screenshotUrl = null;

    // ... (rest van de screenshot logica blijft hetzelfde) ...

    const newFeedback = new Feedback({
        message,
        customerId, // Sla de klant ID op
        screenshotUrl: screenshotUrl,
        url,
        userAgent,
    });

    try {
        const feedback = await newFeedback.save();
        res.status(201).json({ 
            msg: 'Feedback succesvol ontvangen!', 
            id: feedback._id,
            screenshotUrl: feedback.screenshotUrl,
            customerId: feedback.customerId // Stuur de ID terug ter bevestiging
        });
    } catch (err) {
        // ...
    }
});
router.get('/', async (req, res) => {
    // Haal de customerId uit de query parameters (e.g., ?customerId=...)
    const { customerId } = req.query;

    if (!customerId) {
        // Blokkeert de aanroep als de ID ontbreekt
        return res.status(401).json({ msg: 'Klant ID is verplicht voor toegang tot de feedback.' });
    }

    try {
        // GEFILTERD ZOEKEN: Vind alleen feedback met deze specifieke customerId
        const feedbackItems = await Feedback.find({ customerId: customerId }).sort({ date: -1 });
        res.json(feedbackItems);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Serverfout bij ophalen data');
    }
});
module.exports = router;
