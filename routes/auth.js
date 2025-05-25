const express = require('express');
const jwt = require('jsonwebtoken');
const client = require('../dbClient');
require('dotenv').config();

const router = express.Router();

router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Check for existing user
    const { rows: existingUsers } = await client.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Insert new user
    const { rows } = await client.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *',
      [name, email, password]
    );

    const user = rows[0];
    const token = jwt.sign({ id: user.id, email }, process.env.JWT_SECRET);
    return res.status(200).json({ token });

  } catch (err) {
    console.error('Signup Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/signin', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await client.query(
      'SELECT * FROM users WHERE email = $1 AND password = $2',
      [email, password]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const token = jwt.sign({ id: user.id, email }, process.env.JWT_SECRET);
    res.json({ token });

  } catch (error) {
    console.error('Signin Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;