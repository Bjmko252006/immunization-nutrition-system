const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Gumawa ng account (BNS o BHW)
router.post('/register', async (req, res) => {
  try {
    const { full_name, role, username, password } = req.body;
    if (!full_name || !role || !username || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }
    const exists = await User.findOne({ username });
    if (exists) {
      return res.status(409).json({ message: 'Username already taken' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({ full_name, role, username, password_hash });
    res.status(201).json({
      id: user._id,
      full_name: user.full_name,
      role: user.role,
      username: user.username,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Mag-login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '8h',
    });
    res.json({
      token,
      user: { id: user._id, full_name: user.full_name, role: user.role, username: user.username },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;