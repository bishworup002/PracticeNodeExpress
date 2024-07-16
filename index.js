const express = require('express');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');

const app = express();
const port = 3000;

// PostgreSQL connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'p@stgress',
  port: 5433,
});

// Middleware
app.use(express.json());

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Routes
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id',
      [username, email, hashedPassword]
    );
    res.status(201).json({ id: result.rows[0].id, message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error registering user' });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      if (await bcrypt.compare(password, user.password)) {
        res.json({ message: 'Login successful', userId: user.id });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Error during login' });
  }
});

app.put('/profile/:id', async (req, res) => {
  const { id } = req.params;
  const { username, email } = req.body;

  try {
    await pool.query(
      'UPDATE users SET username = $1, email = $2 WHERE id = $3',
      [username, email, id]
    );
    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error updating profile' });
  }
});

app.delete('/profile/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'Profile deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting profile' });
  }
});

app.post('/upload/:id', upload.single('picture'), async (req, res) => {
  const { id } = req.params;
  const picturePath = req.file.path;

  try {
    await pool.query(
      'UPDATE users SET picture_path = $1 WHERE id = $2',
      [picturePath, id]
    );
    res.json({ message: 'Picture uploaded successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error uploading picture' });
  }
});

// New route to get all users
app.get('/users', async (req, res) => {
    try {
      const result = await pool.query('SELECT id, username, email, picture_path FROM users');
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: 'Error fetching users' });
    }
  });
  
  // New route to get a user by ID
  app.get('/users/:id', async (req, res) => {
    const { id } = req.params;
  
    try {
      const result = await pool.query('SELECT id, username, email, picture_path FROM users WHERE id = $1', [id]);
      if (result.rows.length > 0) {
        res.json(result.rows[0]);
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    } catch (err) {
      res.status(500).json({ error: 'Error fetching user' });
    }
  });

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});