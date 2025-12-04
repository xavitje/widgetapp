// createUser.js
const mongoose = require('mongoose');
const User = require('./models/User');

const MONGODB_URI = 'mongodb+srv://rafielidrissi_db_user:Rafi2506@widgetcluster.918yozi.mongodb.net/?appName=WidgetCluster';
const EMAIL = 'test@site.nl';
const PASSWORD = 'sterkWachtwoord123';
const CUSTOMER_ID = 'testsite-001';

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Mongo verbonden');

  let user = await User.findOne({ email: EMAIL });
  if (user) {
    console.log('User bestaat al, updaten...');
    user.customerId = CUSTOMER_ID;
  } else {
    user = new User({ email: EMAIL, customerId: CUSTOMER_ID, role: 'client' });
  }

  await user.setPassword(PASSWORD);
  await user.save();

  console.log('User klaar:');
  console.log({ email: EMAIL, customerId: CUSTOMER_ID });
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
