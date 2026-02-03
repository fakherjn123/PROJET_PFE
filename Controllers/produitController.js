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
    const {
      reference,
      nom,
      description,
      categorie,
      prix_achat,
      prix_vente_ht,
      prix_vente_ttc,
      tva_pourcentage,
      unite
    } = req.body;

    const result = await pool.query(
      `INSERT INTO produits 
       (reference, nom, description, categorie, prix_achat, prix_vente_ht, prix_vente_ttc, tva_pourcentage, unite)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        reference,
        nom,
        description || null,
        categorie || null,
        prix_achat ?? 0,
        prix_vente_ht ?? 0,
        prix_vente_ttc || null,
        tva_pourcentage ?? 19,
        unite || "unité"
      ]
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
    const {
      reference,
      nom,
      description,
      categorie,
      prix_achat,
      prix_vente_ht,
      prix_vente_ttc,
      tva_pourcentage,
      unite
    } = req.body;

    const result = await pool.query(
      `UPDATE produits 
       SET reference=COALESCE($2, reference), nom=COALESCE($3, nom), description=COALESCE($4, description),
           categorie=COALESCE($5, categorie), prix_achat=COALESCE($6, prix_achat),
           prix_vente_ht=COALESCE($7, prix_vente_ht), prix_vente_ttc=COALESCE($8, prix_vente_ttc),
           tva_pourcentage=COALESCE($9, tva_pourcentage), unite=COALESCE($10, unite),
           updated_at=CURRENT_TIMESTAMP
       WHERE id=$1
       RETURNING *`,
      [
        id,
        reference,
        nom,
        description,
        categorie,
        prix_achat,
        prix_vente_ht,
        prix_vente_ttc,
        tva_pourcentage,
        unite
      ]
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
