require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Successfully connected to the database');
  release();
});

// Routes
app.get('/', (req, res) => {
  res.json({ status: "OK" });
});

// POST /api/occupancy
app.post('/api/occupancy', async (req, res) => {
  try {
    const { camera_id, occupancy, capacity } = req.body;

    // Validation
    if (!camera_id || occupancy === undefined || capacity === undefined) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (occupancy > capacity) {
      return res.status(400).json({ error: 'Occupancy cannot exceed capacity' });
    }

    const query = `
      INSERT INTO occupancy (camera_id, occupancy, capacity)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;

    const result = await pool.query(query, [camera_id, occupancy, capacity]);
    console.log(`Inserted new occupancy record for camera ${camera_id}`);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error inserting occupancy:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/occupancy
app.get('/api/occupancy', async (req, res) => {
  try {
    const query = `
      SELECT * FROM occupancy
      ORDER BY timestamp DESC
      LIMIT 50;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching occupancy records:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/occupancy/:camera_id
app.get('/api/occupancy/:camera_id', async (req, res) => {
  try {
    const { camera_id } = req.params;
    const query = `
      SELECT * FROM occupancy
      WHERE camera_id = $1
      ORDER BY timestamp DESC
      LIMIT 50;
    `;
    const result = await pool.query(query, [camera_id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching occupancy records:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/occupancy/summary
app.get('/api/occupancy/summary', async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_records,
        AVG(occupancy) as avg_occupancy,
        MAX(timestamp) as latest_timestamp,
        COUNT(DISTINCT camera_id) as unique_cameras
      FROM occupancy;
    `;
    const result = await pool.query(query);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching occupancy summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/occupancy/:id
app.delete('/api/admin/occupancy/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      DELETE FROM occupancy
      WHERE id = $1
      RETURNING *;
    `;
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    console.log(`Deleted occupancy record with ID ${id}`);
    res.json({ message: 'Record deleted successfully', deleted: result.rows[0] });
  } catch (error) {
    console.error('Error deleting occupancy record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 