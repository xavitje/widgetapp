require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const MONGODB_URI = 'mongodb+srv://rafielidrissi_db_user:Rafi2506@widgetcluster.918yozi.mongodb.net/?appName=WidgetCluster';

(async () => {
  await mongoose.connect(MONGODB_URI);
  const user = await User.findOne({ email: 'test@site.nl' }); // pas aan naar bestaand e-mailadres
  console.log('Document in DB:', JSON.stringify(user, null, 2));
  console.log('passwordHash veld:', user.passwordHash);
  await mongoose.disconnect();
})();
