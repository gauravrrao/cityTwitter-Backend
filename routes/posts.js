const express = require("express");
const { upload } = require("../utils/cloudinary");
const client = require("../dbClient");
const auth = require("../middleware/auth");

const router = express.Router();

router.post("/", auth, upload.single("image"), async (req, res) => {
  const { content, type } = req.body;

  if (!content || content.length > 280) {
    return res
      .status(400)
      .json({ error: "Content is required and must be under 280 characters" });
  }

  if (!["recommend", "help", "update", "event"].includes(type)) {
    return res.status(400).json({ error: "Invalid post type" });
  }

  const imageUrl = req.file?.path || null;
  try {
    await client.query(
      "INSERT INTO posts (content, type, image_url, user_id) VALUES ($1, $2, $3, $4)",
      [content, type, imageUrl, req.user.id]
    );
    res.json({ message: "Post created" });
  } catch (error) {
    console.error("Post insert error:", error.message);
    console.error(error.stack);
    res.status(500).json({ error: "Failed to create post" });
  }
});

router.get("/", async (req, res) => {
  try {
    const { rows } = await client.query(
      `
      SELECT 
        posts.id,
        posts.content,
        posts.type,
        posts.image_url AS "imageUrl",
        users.name AS author,
        COALESCE(likes.likes_count, 0) AS likes,
        COALESCE(dislikes.dislikes_count, 0) AS dislikes,
        COALESCE(replies_data.replies, '[]') AS replies
      FROM posts
      JOIN users ON posts.user_id = users.id
      LEFT JOIN (
        SELECT post_id, COUNT(*) AS likes_count
        FROM post_likes
        WHERE type = 'like'
        GROUP BY post_id
      ) AS likes ON likes.post_id = posts.id
      LEFT JOIN (
        SELECT post_id, COUNT(*) AS dislikes_count
        FROM post_likes
        WHERE type = 'dislike'
        GROUP BY post_id
      ) AS dislikes ON dislikes.post_id = posts.id
LEFT JOIN (
  SELECT 
    post_replies.post_id, 
    JSON_AGG(JSON_BUILD_OBJECT(
      'id', post_replies.id,
      'content', post_replies.content,
      'author', users.name,
      'created_at', post_replies.created_at
    )) AS replies
  FROM post_replies
  JOIN users ON post_replies.user_id = users.id
  GROUP BY post_replies.post_id
) AS replies_data ON replies_data.post_id = posts.id
      ORDER BY posts.created_at DESC
      `
    );

    res.json({ posts: rows });
  } catch (error) {
    console.error("Fetch posts error:", error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

router.post("/:postId/reply", auth, async (req, res) => {
  const { content } = req.body;
  const { postId } = req.params;

  if (!content?.trim())
    return res.status(400).json({ error: "Reply content required" });

  try {
    await client.query(
      `INSERT INTO post_replies (post_id, user_id, content) VALUES ($1, $2, $3)`,
      [postId, req.user.id, content]
    );
    res.json({ message: "Reply added" });
  } catch (err) {
    console.error("Reply error:", err);
    res.status(500).json({ error: "Failed to add reply" });
  }
});

router.post("/:postId/react", auth, async (req, res) => {
 const { type } = req.body; // 'like' or 'dislike'
  const userId = req.user.id;
  const postId = req.params.postId;

  try {
    const existing = await client.query(
      'SELECT type FROM post_likes WHERE user_id = $1 AND post_id = $2',
      [userId, postId]
    );

    if (existing.rows.length === 0) {
      await client.query(
        'INSERT INTO post_likes (user_id, post_id, type) VALUES ($1, $2, $3)',
        [userId, postId, type]
      );
    } else if (existing.rows[0].type === type) {
      await client.query(
        'DELETE FROM post_likes WHERE user_id = $1 AND post_id = $2',
        [userId, postId]
      );
    } else {
      await client.query(
        'UPDATE post_likes SET type = $1 WHERE user_id = $2 AND post_id = $3',
        [type, userId, postId]
      );
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to react' });
  }
});

module.exports = router;
