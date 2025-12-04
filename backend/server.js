const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const feedbackRoutes = require('./routes/feedback');
const app = express();
const PORT = 3000

// --- 1. Database Connectie ---
const MONGODB_URI = 'mongodb+srv://rafielidrissi_db_user:Rafi2506@widgetcluster.918yozi.mongodb.net/?appName=WidgetCluster';
mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB is verbonden!'))
    .catch(err => console.error('MongoDB fout:', err));
const cors = require('cors'); // Zorg dat deze import bovenaan staat

// De lijst met toegestane domeinen. Voeg HIER je echte domeinen toe.
const allowedOrigins = [
    'https://jouwwebsite.nl', // Je productiewebsite (met HTTPS)
    'http://localhost:5500',  // Lokale ontwikkeling (indien gebruikt)
    'http://127.0.0.1:5500',  // Lokale ontwikkeling (een andere veelvoorkomende poort)
    'http://38.242.144.86:8088', // Je dashboard URL (als je deze gebruikt zonder /dashboard)
    'http://38.242.144.86:8088/dashboard' // Je dashboard URL
]; 

const corsOptions = {
    origin: (origin, callback) => {
        // Staat toe als de oorsprong in de lijst staat OF als er geen oorsprong is 
        // (bijvoorbeeld bij curl of lokale tools)
        if (!origin || allowedOrigins.some(ao => origin.startsWith(ao))) {
            callback(null, true);
        } else {
            // Dit zal een CORS-fout in de browser veroorzaken bij niet-toegestane websites
            callback(new Error('Niet toegestaan door CORS (Externe website)'));
        }
    },
    methods: ['GET', 'POST'], // Alleen deze methoden toestaan
};

// --- 2. Middleware Configuratie ---
// CORS: Sta verzoeken van *elke* oorsprong toe. Voor productie kun je dit beperken!
app.use(cors(corsOptions));

// Body-parser om JSON te parsen. Limit is verhoogd voor Base64 screenshots.
app.use(bodyParser.json({ limit: '10mb' }));
app.use('/api/v1/feedback', feedbackRoutes);

// --- 3. Start de Server ---
app.listen(PORT, () => {
    console.log(`API Server draait op poort ${PORT}`);
});
