const { pool } = require("../db/db");

// Récupérer tous les clients
module.exports.getAllClients = async (req, res) => {
  try {
    const { statut, search } = req.query;
    
    let query = `
      SELECT * FROM clients 
      WHERE 1=1
    `;
    const params = [];
    
    if (statut) {
      params.push(statut);
      query += ` AND statut = $${params.length}`;
    }
    
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (nom ILIKE $${params.length} OR prenom ILIKE $${params.length} OR email ILIKE $${params.length})`;
    }
    
    query += " ORDER BY nom, prenom";
    
    const result = await pool.query(query, params);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Récupérer un client par ID
module.exports.getClientById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      "SELECT * FROM clients WHERE id = $1",
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Client introuvable" });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Créer un client
module.exports.createClient = async (req, res) => {
  try {
    const {
      nom,
      prenom,
      email,
      telephone,
      raison_sociale,
      statut,
      adresse,
      code_postal,
      ville,
      pays,
      notes
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO clients (
        nom, prenom, email, telephone, raison_sociale,
        statut, adresse, code_postal, ville, pays, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        nom,
        prenom || null,
        email || null,
        telephone || null,
        raison_sociale || null,
        statut || "Actif",
        adresse || null,
        code_postal || null,
        ville || null,
        pays || "Tunisie",
        notes || null
      ]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mettre à jour un client
module.exports.updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nom,
      prenom,
      email,
      telephone,
      raison_sociale,
      statut,
      adresse,
      code_postal,
      ville,
      pays,
      notes
    } = req.body;
    
    const result = await pool.query(
      `UPDATE clients SET
        nom = COALESCE($2, nom),
        prenom = COALESCE($3, prenom),
        email = COALESCE($4, email),
        telephone = COALESCE($5, telephone),
        raison_sociale = COALESCE($6, raison_sociale),
        statut = COALESCE($7, statut),
        adresse = COALESCE($8, adresse),
        code_postal = COALESCE($9, code_postal),
        ville = COALESCE($10, ville),
        pays = COALESCE($11, pays),
        notes = COALESCE($12, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *`,
      [
        id,
        nom,
        prenom,
        email,
        telephone,
        raison_sociale,
        statut,
        adresse,
        code_postal,
        ville,
        pays,
        notes
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Client introuvable" });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Supprimer un client
module.exports.deleteClient = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      "DELETE FROM clients WHERE id = $1 RETURNING id",
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Client introuvable" });
    }
    
    res.status(200).json({ message: "Client supprimé avec succès" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
