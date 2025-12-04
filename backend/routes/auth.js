

const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-change-me';
const JWT_EXPIRES_IN = '7d';

router.post('/register', async (req, res) => {
  try {
    const { email, password, customerId, role } = req.body;

    if (!email || !password || !customerId) {
      return res.status(400).json({ msg: 'email, password en customerId zijn verplicht.' });
    }

    const existing = await User.findOne({ email }).select('+passwordHash');
    if (existing) {
      return res.status(409).json({ msg: 'Email bestaat al.' });
    }

    const user = new User({ email, customerId, role: role || 'client' });
    await user.setPassword(password);
    await user.save();

    res.status(201).json({ msg: 'User aangemaakt.' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ msg: 'Serverfout bij register.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ msg: 'email en password zijn verplicht.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ msg: 'Ongeldige inloggegevens.' });
    }

    const isValid = await user.validatePassword(password);
    if (!isValid) {
      return res.status(401).json({ msg: 'Ongeldige inloggegevens.' });
    }

    const token = jwt.sign(
      {
        sub: user._id.toString(),
        email: user.email,
        customerId: user.customerId,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        customerId: user.customerId,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ msg: 'Serverfout bij login.' });
  }
});

module.exports = router;
