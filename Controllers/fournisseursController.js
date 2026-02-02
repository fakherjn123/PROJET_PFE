const { pool } = require("../db/db");

// Récupérer tous les fournisseurs
module.exports.getAllFournisseurs = async (req, res) => {
  try {
    const { is_active, search } = req.query;
    
    let query = `
      SELECT * FROM fournisseurs 
      WHERE 1=1
    `;
    const params = [];
    
    if (is_active !== undefined) {
      params.push(is_active === 'true');
      query += ` AND is_active = $${params.length}`;
    }
    
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (nom ILIKE $${params.length} OR email ILIKE $${params.length} OR raison_sociale ILIKE $${params.length})`;
    }
    
    query += " ORDER BY nom";
    
    const result = await pool.query(query, params);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Récupérer un fournisseur par ID
module.exports.getFournisseurById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      "SELECT * FROM fournisseurs WHERE id = $1",
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Fournisseur introuvable" });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Créer un fournisseur
module.exports.createFournisseur = async (req, res) => {
  try {
    const {
      nom,
      email,
      telephone,
      raison_sociale,
      siret,
      adresse,
      code_postal,
      ville,
      pays,
      delai_paiement,
      notes
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO fournisseurs (
        nom, email, telephone, raison_sociale, siret,
        adresse, code_postal, ville, pays,
        delai_paiement, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        nom,
        email || null,
        telephone || null,
        raison_sociale || null,
        siret || null,
        adresse || null,
        code_postal || null,
        ville || null,
        pays || "Tunisie",
        delai_paiement || 30,
        notes || null
      ]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mettre à jour un fournisseur
module.exports.updateFournisseur = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nom,
      email,
      telephone,
      raison_sociale,
      siret,
      adresse,
      code_postal,
      ville,
      pays,
      delai_paiement,
      notes,
      is_active
    } = req.body;
    
    const result = await pool.query(
      `UPDATE fournisseurs SET
        nom = COALESCE($2, nom),
        email = COALESCE($3, email),
        telephone = COALESCE($4, telephone),
        raison_sociale = COALESCE($5, raison_sociale),
        siret = COALESCE($6, siret),
        adresse = COALESCE($7, adresse),
        code_postal = COALESCE($8, code_postal),
        ville = COALESCE($9, ville),
        pays = COALESCE($10, pays),
        delai_paiement = COALESCE($11, delai_paiement),
        notes = COALESCE($12, notes),
        is_active = COALESCE($13, is_active)
      WHERE id = $1
      RETURNING *`,
      [
        id,
        nom,
        email,
        telephone,
        raison_sociale,
        siret,
        adresse,
        code_postal,
        ville,
        pays,
        delai_paiement,
        notes,
        is_active
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Fournisseur introuvable" });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Supprimer un fournisseur (soft delete)
module.exports.deleteFournisseur = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      "UPDATE fournisseurs SET is_active = false WHERE id = $1 RETURNING *",
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Fournisseur introuvable" });
    }
    
    res.status(200).json({ message: "Fournisseur désactivé avec succès" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
