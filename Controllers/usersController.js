const { pool } = require("../db/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Get all users
module.exports.getAllUsers = async (req, res) => {
  try {
    const result = await pool.query("SELECT id, username, email, role FROM users");
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
      "SELECT id, username, email, role FROM users WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "User introuvable" });

    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add client
module.exports.addClient = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (username, email, password, role) VALUES ($1,$2,$3,'user') RETURNING id, username, email, role",
      [username, email, hashed]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add admin
module.exports.addAdmin = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (username, email, password, role) VALUES ($1,$2,$3,'admin') RETURNING id, username, email, role",
      [username, email, hashed]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login
module.exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0)
      return res.status(401).json({ message: "Email incorrect" });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);

    if (!valid)
      return res.status(401).json({ message: "Mot de passe incorrect" });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || "net_9antra_secret_key_2026",
      { expiresIn: "1h" }
    );

    res.cookie("jwt_Token", token, { httpOnly: true, maxAge: 3600 * 1000 });
    res.status(200).json({ 
      message: "Connexion réussie", 
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Logout
module.exports.logout = async (req, res) => {
  res.cookie("jwt_Token", "", { httpOnly: true, maxAge: 1 });
  res.status(200).json({ message: "Déconnexion réussie" });
};

// Update user
module.exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email } = req.body;

    const result = await pool.query(
      "UPDATE users SET username=$2, email=$3 WHERE id=$1 RETURNING id, username, email, role",
      [id, username, email]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "User introuvable" });

    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update password
module.exports.updatePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const userId = req.user.id;

    const hashed = await bcrypt.hash(newPassword, 10);

    await pool.query(
      "UPDATE users SET password=$1 WHERE id=$2",
      [hashed, userId]
    );

    res.status(200).json({ message: "Mot de passe modifié" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete user
module.exports.deleteUserById = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM users WHERE id=$1", [id]);

    res.status(200).json({ message: "User supprimé" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};