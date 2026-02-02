const { pool } = require("../db/db");

// ==================== CAISSE ====================

// Récupérer toutes les caisses
module.exports.getAllCaisses = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*,
        u.username as responsable_nom
      FROM caisse c
      LEFT JOIN users u ON c.responsable_id = u.id
      WHERE c.is_active = true
      ORDER BY c.nom
    `);
    
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Créer une caisse
module.exports.createCaisse = async (req, res) => {
  try {
    const { nom, solde, devise, responsable_id } = req.body;
    
    const result = await pool.query(`
      INSERT INTO caisse (nom, solde, devise, responsable_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [nom, solde || 0, devise || 'TND', responsable_id]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== COMPTES BANCAIRES ====================

// Récupérer tous les comptes bancaires
module.exports.getAllComptesBancaires = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM comptes_bancaires
      WHERE is_active = true
      ORDER BY nom
    `);
    
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Créer un compte bancaire
module.exports.createCompteBancaire = async (req, res) => {
  try {
    const { nom, banque, numero_compte, iban, bic, solde, devise } = req.body;
    
    const result = await pool.query(`
      INSERT INTO comptes_bancaires (nom, banque, numero_compte, iban, bic, solde, devise)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [nom, banque, numero_compte, iban, bic, solde || 0, devise || 'TND']);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== TRANSACTIONS ====================

// Récupérer toutes les transactions
module.exports.getAllTransactions = async (req, res) => {
  try {
    const { type, date_debut, date_fin, categorie } = req.query;
    
    let query = `
      SELECT t.*,
        c.nom as caisse_nom,
        cb.nom as compte_bancaire_nom,
        cl.nom || ' ' || cl.prenom as client_nom,
        f.numero as facture_numero,
        u.username
      FROM transactions t
      LEFT JOIN caisse c ON t.caisse_id = c.id
      LEFT JOIN comptes_bancaires cb ON t.compte_bancaire_id = cb.id
      LEFT JOIN clients cl ON t.client_id = cl.id
      LEFT JOIN factures f ON t.facture_id = f.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (type) {
      params.push(type);
      query += ` AND t.type = $${params.length}`;
    }
    
    if (categorie) {
      params.push(categorie);
      query += ` AND t.categorie = $${params.length}`;
    }
    
    if (date_debut) {
      params.push(date_debut);
      query += ` AND t.date_transaction >= $${params.length}`;
    }
    
    if (date_fin) {
      params.push(date_fin);
      query += ` AND t.date_transaction <= $${params.length}`;
    }
    
    query += ' ORDER BY t.date_transaction DESC, t.created_at DESC LIMIT 200';
    
    const result = await pool.query(query, params);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Créer une transaction
module.exports.createTransaction = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const {
      type,
      categorie,
      montant,
      caisse_id,
      compte_bancaire_id,
      client_id,
      fournisseur_id,
      facture_id,
      date_transaction,
      mode_paiement,
      reference,
      description
    } = req.body;
    
    // Vérifier qu'au moins une caisse ou un compte bancaire est spécifié
    if (!caisse_id && !compte_bancaire_id) {
      throw new Error("Une caisse ou un compte bancaire doit être spécifié");
    }
    
    // Créer la transaction
    const result = await client.query(`
      INSERT INTO transactions (
        type, categorie, montant, caisse_id, compte_bancaire_id,
        client_id, fournisseur_id, facture_id, date_transaction,
        mode_paiement, reference, description, user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      type,
      categorie,
      montant,
      caisse_id,
      compte_bancaire_id,
      client_id,
      fournisseur_id,
      facture_id,
      date_transaction || new Date(),
      mode_paiement,
      reference,
      description,
      req.user?.id
    ]);
    
    // Mettre à jour le solde
    if (caisse_id) {
      const operation = type === 'Entrée' ? '+' : '-';
      await client.query(
        `UPDATE caisse SET solde = solde ${operation} $1 WHERE id = $2`,
        [montant, caisse_id]
      );
    }
    
    if (compte_bancaire_id) {
      const operation = type === 'Entrée' ? '+' : '-';
      await client.query(
        `UPDATE comptes_bancaires SET solde = solde ${operation} $1 WHERE id = $2`,
        [montant, compte_bancaire_id]
      );
    }
    
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: error.message });
  } finally {
    client.release();
  }
};

// Supprimer une transaction
module.exports.deleteTransaction = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    
    // Récupérer la transaction
    const transactionResult = await client.query('SELECT * FROM transactions WHERE id = $1', [id]);
    if (transactionResult.rows.length === 0) {
      throw new Error("Transaction introuvable");
    }
    
    const transaction = transactionResult.rows[0];
    
    // Inverser l'impact sur le solde
    if (transaction.caisse_id) {
      const operation = transaction.type === 'Entrée' ? '-' : '+';
      await client.query(
        `UPDATE caisse SET solde = solde ${operation} $1 WHERE id = $2`,
        [transaction.montant, transaction.caisse_id]
      );
    }
    
    if (transaction.compte_bancaire_id) {
      const operation = transaction.type === 'Entrée' ? '-' : '+';
      await client.query(
        `UPDATE comptes_bancaires SET solde = solde ${operation} $1 WHERE id = $2`,
        [transaction.montant, transaction.compte_bancaire_id]
      );
    }
    
    // Supprimer la transaction
    await client.query('DELETE FROM transactions WHERE id = $1', [id]);
    
    await client.query('COMMIT');
    res.status(200).json({ message: "Transaction supprimée avec succès" });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: error.message });
  } finally {
    client.release();
  }
};

// Statistiques de trésorerie
module.exports.getStatistiquesTresorerie = async (req, res) => {
  try {
    const { date_debut, date_fin } = req.query;
    
    const params = [];
    let dateFilter = '';
    
    if (date_debut && date_fin) {
      params.push(date_debut, date_fin);
      dateFilter = 'AND date_transaction BETWEEN $1 AND $2';
    }
    
    const result = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'Entrée' THEN montant ELSE 0 END), 0) as total_entrees,
        COALESCE(SUM(CASE WHEN type = 'Sortie' THEN montant ELSE 0 END), 0) as total_sorties,
        COALESCE(SUM(CASE WHEN type = 'Entrée' THEN montant ELSE -montant END), 0) as solde_net,
        COUNT(*) as nombre_transactions
      FROM transactions
      WHERE 1=1 ${dateFilter}
    `, params);
    
    // Soldes actuels
    const soldesResult = await pool.query(`
      SELECT 
        'Caisse' as type,
        SUM(solde) as solde_total
      FROM caisse
      WHERE is_active = true
      UNION ALL
      SELECT 
        'Banque' as type,
        SUM(solde) as solde_total
      FROM comptes_bancaires
      WHERE is_active = true
    `);
    
    res.status(200).json({
      transactions: result.rows[0],
      soldes: soldesResult.rows
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Transfert entre comptes
module.exports.transfertComptes = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const {
      montant,
      caisse_source_id,
      compte_source_id,
      caisse_destination_id,
      compte_destination_id,
      description
    } = req.body;
    
    // Créer la sortie
    await client.query(`
      INSERT INTO transactions (
        type, categorie, montant, caisse_id, compte_bancaire_id,
        date_transaction, description, user_id
      ) VALUES ('Sortie', 'Transfert', $1, $2, $3, CURRENT_DATE, $4, $5)
    `, [montant, caisse_source_id, compte_source_id, description, req.user?.id]);
    
    // Créer l'entrée
    await client.query(`
      INSERT INTO transactions (
        type, categorie, montant, caisse_id, compte_bancaire_id,
        date_transaction, description, user_id
      ) VALUES ('Entrée', 'Transfert', $1, $2, $3, CURRENT_DATE, $4, $5)
    `, [montant, caisse_destination_id, compte_destination_id, description, req.user?.id]);
    
    // Mettre à jour les soldes sources
    if (caisse_source_id) {
      await client.query('UPDATE caisse SET solde = solde - $1 WHERE id = $2', [montant, caisse_source_id]);
    }
    if (compte_source_id) {
      await client.query('UPDATE comptes_bancaires SET solde = solde - $1 WHERE id = $2', [montant, compte_source_id]);
    }
    
    // Mettre à jour les soldes destinations
    if (caisse_destination_id) {
      await client.query('UPDATE caisse SET solde = solde + $1 WHERE id = $2', [montant, caisse_destination_id]);
    }
    if (compte_destination_id) {
      await client.query('UPDATE comptes_bancaires SET solde = solde + $1 WHERE id = $2', [montant, compte_destination_id]);
    }
    
    await client.query('COMMIT');
    res.status(201).json({ message: "Transfert effectué avec succès" });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: error.message });
  } finally {
    client.release();
  }
};