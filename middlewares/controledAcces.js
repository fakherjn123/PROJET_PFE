const controledAcces = (req, res, next) => {
  // ✅ Comparaison insensible à la casse
  if (!req.user || req.user.role?.toLowerCase() !== "admin") {
    return res.status(403).json({
      message: "Accès refusé (Admin uniquement)"
    });
  }
  next();
};

module.exports = { controledAcces };