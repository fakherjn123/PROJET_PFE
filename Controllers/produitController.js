const { pool } = require("../db/db");

// Get all produits
module.exports.getAllProduits = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM produits WHERE is_active = true ORDER BY created_at DESC"
    );
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get produit by id
module.exports.getProduitById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM produits WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "Produit introuvable" });

    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create produit
module.exports.createProduit = async (req, res) => {
  try {
    const { reference, nom, description, prix_achat, prix_vente } = req.body;

    const result = await pool.query(
      `INSERT INTO produits 
       (reference, nom, description, prix_achat, prix_vente)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [reference, nom, description, prix_achat, prix_vente]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update produit
module.exports.updateProduit = async (req, res) => {
  try {
    const { id } = req.params;
    const { reference, nom, description, prix_achat, prix_vente } = req.body;

    const result = await pool.query(
      `UPDATE produits 
       SET reference=$2, nom=$3, description=$4, prix_achat=$5, prix_vente=$6
       WHERE id=$1
       RETURNING *`,
      [id, reference, nom, description, prix_achat, prix_vente]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "Produit introuvable" });

    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete produit (soft delete)
module.exports.deleteProduit = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      "UPDATE produits SET is_active=false WHERE id=$1",
      [id]
    );

    res.status(200).json({ message: "Produit supprimé" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
