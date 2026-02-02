const jwt = require("jsonwebtoken");
const { pool } = require("../db");
require("dotenv").config();

const requireAuthUser = async (req, res, next) => {
  try {
    let token = null;
    
    // 1️⃣ Vérifier le header Authorization (Bearer TOKEN)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } 
    // 2️⃣ Sinon vérifier le cookie (pour le navigateur)
    else if (req.cookies && req.cookies.jwt_Token) {
      token = req.cookies.jwt_Token;
    }

    if (!token) {
      return res.status(401).json({ message: "Authentification requise. Veuillez vous connecter." });
    }

    // Vérifier le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "net_9antra_secret_key_2026");

    // Charger l'utilisateur
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
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: "Token expiré, veuillez vous reconnecter" });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: "Token invalide" });
    }
    console.error("Erreur d'authentification:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

module.exports = { requireAuthUser };