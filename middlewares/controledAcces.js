const controledAcces = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentification requise" });
    }
    
    if (req.user.role === "admin") {
      next();
    } else {
      return res.status(403).json({ message: "Accès refusé. Droits administrateur requis." });
    }
  } catch (error) {
    console.error("Erreur de contrôle d'accès:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

module.exports = { controledAcces };