const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

pool.on('error', (err) => {
  console.error('❌ Erreur inattendue du pool:', err);
  process.exit(-1);
});

const connectToPostgres = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL database');
    client.release();
  } catch (err) {
    console.error('❌ Error connecting to PostgreSQL:', err.stack);
    process.exit(1);
  }
};

module.exports = { pool, connectToPostgres };