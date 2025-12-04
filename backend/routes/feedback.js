const express = require('express');
const router = express.Router();
const Feedback = require('../models/feedback');

const auth = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '../../feedback-images'); 
const PUBLIC_URL_BASE = 'http://38.242.144.86:8088/feedback-images/'; 

function saveBase64Image(base64Data, filename) {
    return new Promise((resolve, reject) => {
        const base64Image = base64Data.split(';base64,').pop();
        
        const filePath = path.join(UPLOAD_DIR, filename);

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

router.post('/', async (req, res) => {
  const { message, screenshot, url, userAgent, customerId } = req.body;

  if (!message || !url || !customerId) {
    return res.status(400).json({ msg: 'Bericht, URL en Klant ID zijn verplicht.' });
  }

  let screenshotUrl = null;

  try {
    if (screenshot) {
      const filename = `screenshot-${Date.now()}.png`;
      screenshotUrl = await saveBase64Image(screenshot, filename);
    }

    const newFeedback = new Feedback({
      message,
      customerId,
      screenshotUrl: screenshotUrl,
      url,
      userAgent,
    });

    const feedback = await newFeedback.save();

    res.status(201).json({
      msg: 'Feedback succesvol ontvangen!',
      id: feedback._id,
      screenshotUrl: feedback.screenshotUrl,
      customerId: feedback.customerId,
    });
  } catch (err) {
    console.error('Fout bij opslaan feedback:', err);
    res.status(500).json({ msg: 'Serverfout bij opslaan feedback.' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const customerId = req.user.customerId;

    const feedbackItems = await Feedback
      .find({ customerId })
      .sort({ date: -1 });

    res.json(feedbackItems);
  } catch (err) {
    console.error('Fout bij ophalen feedback:', err);
    res.status(500).send('Serverfout bij ophalen data');
  }
});

module.exports = router;
