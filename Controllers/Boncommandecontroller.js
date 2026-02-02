const { pool } = require("../db/db");

// Récupérer tous les bons de commande
module.exports.getAllBonCommandes = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT bc.*,
        c.nom || ' ' || c.prenom as client_nom,
        c.email as client_email,
        u.username as vendeur_nom
      FROM bon_commandes bc
      LEFT JOIN clients c ON bc.client_id = c.id
      LEFT JOIN users u ON bc.vendeur_id = u.id
      ORDER BY bc.created_at DESC
    `);
    
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Récupérer un bon de commande par ID
module.exports.getBonCommandeById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const bcResult = await pool.query(`
      SELECT bc.*,
        c.nom || ' ' || c.prenom as client_nom,
        c.email as client_email,
        c.telephone as client_telephone,
        u.username as vendeur_nom
      FROM bon_commandes bc
      LEFT JOIN clients c ON bc.client_id = c.id
      LEFT JOIN users u ON bc.vendeur_id = u.id
      WHERE bc.id = $1
    `, [id]);
    
    if (bcResult.rows.length === 0) {
      return res.status(404).json({ message: "Bon de commande introuvable" });
    }
    
    const detailsResult = await pool.query(`
      SELECT bcd.*,
        p.reference as produit_reference,
        p.nom as produit_nom
      FROM bon_commande_details bcd
      LEFT JOIN produits p ON bcd.produit_id = p.id
      WHERE bcd.bon_commande_id = $1
    `, [id]);
    
    const bonCommande = {
      ...bcResult.rows[0],
      details: detailsResult.rows
    };
    
    res.status(200).json(bonCommande);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Créer un nouveau bon de commande
module.exports.createBonCommande = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const {
      client_id,
      date_commande,
      date_livraison_prevue,
      notes,
      details
    } = req.body;
    
    // Générer le numéro
    const year = new Date().getFullYear();
    const countResult = await client.query(
      "SELECT COUNT(*) as count FROM bon_commandes WHERE EXTRACT(YEAR FROM date_commande) = $1",
      [year]
    );
    const numero = `BC-${year}-${String(parseInt(countResult.rows[0].count) + 1).padStart(4, '0')}`;
    
    // Créer le bon de commande
    const bcResult = await client.query(`
      INSERT INTO bon_commandes (
        numero, client_id, date_commande, date_livraison_prevue,
        notes, vendeur_id, statut
      ) VALUES ($1, $2, $3, $4, $5, $6, 'En attente')
      RETURNING *
    `, [
      numero,
      client_id,
      date_commande || new Date(),
      date_livraison_prevue,
      notes,
      req.user?.id
    ]);
    
    const bonCommande = bcResult.rows[0];
    let montant_ht_total = 0;
    let montant_tva_total = 0;
    let montant_ttc_total = 0;
    
    // Ajouter les détails
    if (details && Array.isArray(details)) {
      for (const detail of details) {
        const montant_ht = detail.quantite * detail.prix_unitaire_ht;
        const montant_tva = montant_ht * (detail.tva_pourcentage || 19) / 100;
        const montant_ttc = montant_ht + montant_tva;
        
        await client.query(`
          INSERT INTO bon_commande_details (
            bon_commande_id, produit_id, designation, quantite,
            prix_unitaire_ht, tva_pourcentage,
            montant_ht, montant_tva, montant_ttc
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          bonCommande.id,
          detail.produit_id,
          detail.designation,
          detail.quantite,
          detail.prix_unitaire_ht,
          detail.tva_pourcentage || 19,
          montant_ht,
          montant_tva,
          montant_ttc
        ]);
        
        montant_ht_total += montant_ht;
        montant_tva_total += montant_tva;
        montant_ttc_total += montant_ttc;
      }
    }
    
    // Mettre à jour les montants
    await client.query(`
      UPDATE bon_commandes 
      SET montant_ht = $2, montant_tva = $3, montant_ttc = $4
      WHERE id = $1
    `, [bonCommande.id, montant_ht_total, montant_tva_total, montant_ttc_total]);
    
    await client.query('COMMIT');
    res.status(201).json({ 
      ...bonCommande, 
      montant_ht: montant_ht_total, 
      montant_tva: montant_tva_total, 
      montant_ttc: montant_ttc_total 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: error.message });
  } finally {
    client.release();
  }
};

// Mettre à jour le statut d'un bon de commande
module.exports.updateBonCommandeStatut = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;
    
    const result = await pool.query(`
      UPDATE bon_commandes 
      SET statut = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id, statut]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Bon de commande introuvable" });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Supprimer un bon de commande
module.exports.deleteBonCommande = async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query('DELETE FROM bon_commandes WHERE id = $1', [id]);
    res.status(200).json({ message: "Bon de commande supprimé avec succès" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};