const jwt = require("jsonwebtoken");
const { pool } = require("../db/db");  // ✅ Correction ici : ../db/db
require("dotenv").config();

const requireAuthUser = async (req, res, next) => {
  try {
    let token = null;

    // 1️⃣ Authorization Header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
    // 2️⃣ Cookie
    else if (req.cookies && req.cookies.jwt_Token) {
      token = req.cookies.jwt_Token;
    }

    if (!token) {
      return res.status(401).json({ message: "Authentification requise" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "net_9antra_secret_key_2026"
    );

    const result = await pool.query(
      "SELECT id, username, email, role FROM users WHERE id = $1",
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Utilisateur non trouvé" });
    }

    req.user = result.rows[0];
    next();

  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expiré" });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Token invalide" });
    }
    console.error("Auth middleware error:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

module.exports = { requireAuthUser };