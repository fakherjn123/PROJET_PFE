const { pool } = require("../db/db");

// Récupérer tous les entrepôts
module.exports.getAllEntrepots = async (req, res) => {
  try {
    const { is_active } = req.query;
    
    let query = `
      SELECT * FROM entrepots 
      WHERE 1=1
    `;
    const params = [];
    
    if (is_active !== undefined) {
      params.push(is_active === 'true');
      query += ` AND is_active = $${params.length}`;
    }
    
    query += " ORDER BY nom";
    
    const result = await pool.query(query, params);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Récupérer un entrepôt par ID
module.exports.getEntrepotById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      "SELECT * FROM entrepots WHERE id = $1",
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Entrepôt introuvable" });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Créer un entrepôt
module.exports.createEntrepot = async (req, res) => {
  try {
    const {
      nom,
      adresse,
      ville,
      responsable,
      telephone,
      capacite
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO entrepots (nom, adresse, ville, responsable, telephone, capacite)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        nom,
        adresse || null,
        ville || null,
        responsable || null,
        telephone || null,
        capacite || null
      ]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mettre à jour un entrepôt
module.exports.updateEntrepot = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nom,
      adresse,
      ville,
      responsable,
      telephone,
      capacite,
      is_active
    } = req.body;
    
    const result = await pool.query(
      `UPDATE entrepots SET
        nom = COALESCE($2, nom),
        adresse = COALESCE($3, adresse),
        ville = COALESCE($4, ville),
        responsable = COALESCE($5, responsable),
        telephone = COALESCE($6, telephone),
        capacite = COALESCE($7, capacite),
        is_active = COALESCE($8, is_active)
      WHERE id = $1
      RETURNING *`,
      [
        id,
        nom,
        adresse,
        ville,
        responsable,
        telephone,
        capacite,
        is_active
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Entrepôt introuvable" });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Supprimer un entrepôt (soft delete)
module.exports.deleteEntrepot = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      "UPDATE entrepots SET is_active = false WHERE id = $1 RETURNING *",
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Entrepôt introuvable" });
    }
    
    res.status(200).json({ message: "Entrepôt désactivé avec succès" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
