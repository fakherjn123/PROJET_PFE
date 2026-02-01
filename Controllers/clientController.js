const { pool } = require("../db/db");

// Get all users
module.exports.getAllUsers = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users");
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user by id
module.exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM users WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User introuvable" });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create user
module.exports.createUser = async (req, res) => {
  try {
    const { nom, email, password } = req.body;

    const result = await pool.query(
      "INSERT INTO users (nom, email, password) VALUES ($1, $2, $3) RETURNING *",
      [nom, email, password]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete user
module.exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM users WHERE id = $1", [id]);

    res.status(200).json({ message: "User supprimé" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
