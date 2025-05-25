const express = require('express');
const client = require('../dbClient');
const auth = require('../middleware/auth');
const router = express.Router();
const { upload } = require("../utils/cloudinary");

// Get current user's profile
router.get('/', auth, async (req, res) => {
  try {
    const userQuery = await client.query(
      'SELECT name, imageuserurl, bio FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const postQuery = await client.query(
      `
      SELECT 
        id, content, type, image_url AS "imageUrl", created_at
      FROM posts
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [req.user.id]
    );

    res.json({
      ...userQuery.rows[0],
      posts: postQuery.rows,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

// Update current user's profile
router.put('/',auth, upload.single("image"),async (req, res) => {
  
  const imageuserurl =  req.file?.path || null;

  const { name, bio } = req.body;

  if (!name && !imageuserurl && !bio) {
    return res.status(400).json({ error: 'Nothing to update' });
  }

  try {
    const { rowCount } = await client.query(
      `
      UPDATE users
      SET
        name = COALESCE($1, name),
        imageuserurl = COALESCE($2, imageuserurl),
        bio = COALESCE($3, bio)
      WHERE id = $4
      `,
      [name || null, imageuserurl || null, bio || null, req.user.id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Profile updated', img: imageuserurl });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
