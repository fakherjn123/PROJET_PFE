const { pool } = require("../db/db");

// Récupérer toutes les factures
module.exports.getAllFactures = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT f.*,
        c.nom || ' ' || c.prenom as client_nom,
        c.email as client_email,
        u.username as vendeur_nom
      FROM factures f
      LEFT JOIN clients c ON f.client_id = c.id
      LEFT JOIN users u ON f.vendeur_id = u.id
      ORDER BY f.created_at DESC
    `);
    
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Récupérer une facture par ID
module.exports.getFactureById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const factureResult = await pool.query(`
      SELECT f.*,
        c.nom || ' ' || c.prenom as client_nom,
        c.email as client_email,
        c.telephone as client_telephone,
        c.raison_sociale,
        u.username as vendeur_nom
      FROM factures f
      LEFT JOIN clients c ON f.client_id = c.id
      LEFT JOIN users u ON f.vendeur_id = u.id
      WHERE f.id = $1
    `, [id]);
    
    if (factureResult.rows.length === 0) {
      return res.status(404).json({ message: "Facture introuvable" });
    }
    
    const detailsResult = await pool.query(`
      SELECT fd.*,
        p.reference as produit_reference,
        p.nom as produit_nom
      FROM facture_details fd
      LEFT JOIN produits p ON fd.produit_id = p.id
      WHERE fd.facture_id = $1
    `, [id]);
    
    const facture = {
      ...factureResult.rows[0],
      details: detailsResult.rows
    };
    
    res.status(200).json(facture);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Créer une nouvelle facture
module.exports.createFacture = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const {
      client_id,
      bon_commande_id,
      bon_livraison_id,
      date_facture,
      date_echeance,
      mode_paiement,
      conditions_paiement,
      notes,
      details
    } = req.body;
    
    // Générer le numéro
    const year = new Date().getFullYear();
    const countResult = await client.query(
      "SELECT COUNT(*) as count FROM factures WHERE EXTRACT(YEAR FROM date_facture) = $1",
      [year]
    );
    const numero = `FA-${year}-${String(parseInt(countResult.rows[0].count) + 1).padStart(4, '0')}`;
    
    // Créer la facture
    const factureResult = await client.query(`
      INSERT INTO factures (
        numero, client_id, bon_commande_id, bon_livraison_id,
        date_facture, date_echeance, mode_paiement,
        conditions_paiement, notes, vendeur_id, statut
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Impayée')
      RETURNING *
    `, [
      numero,
      client_id,
      bon_commande_id,
      bon_livraison_id,
      date_facture || new Date(),
      date_echeance,
      mode_paiement,
      conditions_paiement,
      notes,
      req.user?.id
    ]);
    
    const facture = factureResult.rows[0];
    let montant_ht_total = 0;
    let montant_tva_total = 0;
    let montant_ttc_total = 0;
    
    // Ajouter les détails
    if (details && Array.isArray(details)) {
      for (const detail of details) {
        const montant_ht = detail.quantite * detail.prix_unitaire_ht * (1 - (detail.remise_pourcentage || 0) / 100);
        const montant_tva = montant_ht * (detail.tva_pourcentage || 19) / 100;
        const montant_ttc = montant_ht + montant_tva;
        
        await client.query(`
          INSERT INTO facture_details (
            facture_id, produit_id, designation, quantite,
            prix_unitaire_ht, tva_pourcentage, remise_pourcentage,
            montant_ht, montant_tva, montant_ttc
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          facture.id,
          detail.produit_id,
          detail.designation,
          detail.quantite,
          detail.prix_unitaire_ht,
          detail.tva_pourcentage || 19,
          detail.remise_pourcentage || 0,
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
      UPDATE factures 
      SET montant_ht = $2, montant_tva = $3, montant_ttc = $4, montant_reste = $4
      WHERE id = $1
    `, [facture.id, montant_ht_total, montant_tva_total, montant_ttc_total]);
    
    await client.query('COMMIT');
    res.status(201).json({ 
      ...facture, 
      montant_ht: montant_ht_total, 
      montant_tva: montant_tva_total, 
      montant_ttc: montant_ttc_total,
      montant_reste: montant_ttc_total
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: error.message });
  } finally {
    client.release();
  }
};

// Enregistrer un paiement sur une facture
module.exports.enregistrerPaiement = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { montant_paye, mode_paiement, date_paiement, caisse_id, compte_bancaire_id } = req.body;
    
    // Récupérer la facture
    const factureResult = await client.query('SELECT * FROM factures WHERE id = $1', [id]);
    if (factureResult.rows.length === 0) {
      throw new Error("Facture introuvable");
    }
    const facture = factureResult.rows[0];
    
    const nouveau_montant_paye = parseFloat(facture.montant_paye) + parseFloat(montant_paye);
    const nouveau_montant_reste = parseFloat(facture.montant_ttc) - nouveau_montant_paye;
    
    if (nouveau_montant_reste < -0.01) {
      throw new Error("Le montant payé dépasse le montant de la facture");
    }
    
    // Déterminer le nouveau statut
    let nouveau_statut;
    if (nouveau_montant_reste <= 0.01) {
      nouveau_statut = 'Payée';
    } else if (nouveau_montant_paye > 0) {
      nouveau_statut = 'Payée partiellement';
    } else {
      nouveau_statut = 'Impayée';
    }
    
    // Mettre à jour la facture
    await client.query(`
      UPDATE factures 
      SET montant_paye = $2, montant_reste = $3, statut = $4,
          mode_paiement = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id, nouveau_montant_paye, nouveau_montant_reste, nouveau_statut, mode_paiement]);
    
    // Enregistrer la transaction
    await client.query(`
      INSERT INTO transactions (
        type, categorie, montant, facture_id, client_id,
        caisse_id, compte_bancaire_id, date_transaction,
        mode_paiement, description, user_id
      ) VALUES ('Entrée', 'Vente', $1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      montant_paye,
      id,
      facture.client_id,
      caisse_id,
      compte_bancaire_id,
      date_paiement || new Date(),
      mode_paiement,
      `Paiement facture ${facture.numero}`,
      req.user?.id
    ]);
    
    // Mettre à jour le solde de la caisse ou du compte bancaire
    if (caisse_id) {
      await client.query(
        'UPDATE caisse SET solde = solde + $1 WHERE id = $2',
        [montant_paye, caisse_id]
      );
    } else if (compte_bancaire_id) {
      await client.query(
        'UPDATE comptes_bancaires SET solde = solde + $1 WHERE id = $2',
        [montant_paye, compte_bancaire_id]
      );
    }
    
    await client.query('COMMIT');
    res.status(200).json({ 
      message: "Paiement enregistré avec succès",
      nouveau_montant_paye,
      nouveau_montant_reste,
      nouveau_statut
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: error.message });
  } finally {
    client.release();
  }
};

// Supprimer une facture
module.exports.deleteFacture = async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query('DELETE FROM factures WHERE id = $1', [id]);
    res.status(200).json({ message: "Facture supprimée avec succès" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtenir les factures impayées
module.exports.getFacturesImpayees = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT f.*,
        c.nom || ' ' || c.prenom as client_nom,
        c.email as client_email
      FROM factures f
      LEFT JOIN clients c ON f.client_id = c.id
      WHERE f.statut IN ('Impayée', 'Payée partiellement')
      ORDER BY f.date_echeance ASC
    `);
    
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};