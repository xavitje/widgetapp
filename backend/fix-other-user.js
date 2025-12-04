const mongoose = require('mongoose');
const User = require('./models/User');

const URI = 'mongodb+srv://rafielidrissi_db_user:Rafi2506@widgetcluster.918yozi.mongodb.net/?appName=WidgetCluster';

(async () => {
  await mongoose.connect(URI);

  // pas het e-mailadres aan naar de user die niet werkt
  const user = await User.findOne({ email: 'rafi.elidrissi@gmail.com' });
  if (!user) {
    console.log('User niet gevonden');
    process.exit(0);
  }

  if (!user.passwordHash) {
    await user.setPassword('eigenaar');
    await user.save();
    console.log('Hash toegevoegd voor', user.email);
  } else {
    console.log('Hash al aanwezig');
  }

  await mongoose.disconnect();
})();
