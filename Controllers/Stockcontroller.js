const { pool } = require("../db/db");

// Récupérer tous les stocks
module.exports.getAllStocks = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*,
        p.reference,
        p.nom as produit_nom,
        p.unite,
        e.nom as entrepot_nom,
        (s.quantite - s.quantite_reservee) as quantite_disponible
      FROM stocks s
      JOIN produits p ON s.produit_id = p.id
      JOIN entrepots e ON s.entrepot_id = e.id
      WHERE p.is_active = true
      ORDER BY e.nom, p.nom
    `);
    
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Récupérer le stock d'un produit
module.exports.getStockByProduit = async (req, res) => {
  try {
    const { produitId } = req.params;
    
    const result = await pool.query(`
      SELECT s.*,
        e.nom as entrepot_nom,
        e.ville,
        (s.quantite - s.quantite_reservee) as quantite_disponible
      FROM stocks s
      JOIN entrepots e ON s.entrepot_id = e.id
      WHERE s.produit_id = $1
      ORDER BY e.nom
    `, [produitId]);
    
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Ajouter/Mettre à jour le stock
module.exports.updateStock = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { produit_id, entrepot_id, quantite, emplacement } = req.body;
    
    // Vérifier si le stock existe
    const existingStock = await client.query(
      'SELECT * FROM stocks WHERE produit_id = $1 AND entrepot_id = $2',
      [produit_id, entrepot_id]
    );
    
    let result;
    if (existingStock.rows.length > 0) {
      // Mettre à jour le stock existant
      result = await client.query(`
        UPDATE stocks 
        SET quantite = $3, emplacement = $4, updated_at = CURRENT_TIMESTAMP
        WHERE produit_id = $1 AND entrepot_id = $2
        RETURNING *
      `, [produit_id, entrepot_id, quantite, emplacement]);
    } else {
      // Créer un nouveau stock
      result = await client.query(`
        INSERT INTO stocks (produit_id, entrepot_id, quantite, emplacement)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [produit_id, entrepot_id, quantite, emplacement]);
    }
    
    await client.query('COMMIT');
    res.status(200).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: error.message });
  } finally {
    client.release();
  }
};

// Enregistrer un mouvement de stock
module.exports.createMouvementStock = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const {
      produit_id,
      entrepot_id,
      type,
      quantite,
      motif,
      reference_document
    } = req.body;
    
    // Récupérer le stock actuel
    const stockResult = await client.query(
      'SELECT quantite FROM stocks WHERE produit_id = $1 AND entrepot_id = $2',
      [produit_id, entrepot_id]
    );
    
    const quantite_avant = stockResult.rows[0]?.quantite || 0;
    let quantite_apres;
    
    // Calculer la nouvelle quantité selon le type de mouvement
    if (type === 'Entrée') {
      quantite_apres = quantite_avant + quantite;
    } else if (type === 'Sortie') {
      quantite_apres = quantite_avant - quantite;
      if (quantite_apres < 0) {
        throw new Error('Stock insuffisant');
      }
    } else {
      quantite_apres = quantite_avant;
    }
    
    // Enregistrer le mouvement
    const mouvementResult = await client.query(`
      INSERT INTO mouvements_stock (
        produit_id, entrepot_id, type, quantite,
        quantite_avant, quantite_apres, motif, reference_document, user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      produit_id, entrepot_id, type, quantite,
      quantite_avant, quantite_apres, motif, reference_document, req.user?.id
    ]);
    
    // Mettre à jour le stock
    await client.query(`
      INSERT INTO stocks (produit_id, entrepot_id, quantite)
      VALUES ($1, $2, $3)
      ON CONFLICT (produit_id, entrepot_id)
      DO UPDATE SET quantite = $3, updated_at = CURRENT_TIMESTAMP
    `, [produit_id, entrepot_id, quantite_apres]);
    
    await client.query('COMMIT');
    res.status(201).json(mouvementResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: error.message });
  } finally {
    client.release();
  }
};

// Récupérer l'historique des mouvements
module.exports.getMouvementsStock = async (req, res) => {
  try {
    const { produitId, entrepotId } = req.query;
    
    let query = `
      SELECT m.*,
        p.reference,
        p.nom as produit_nom,
        e.nom as entrepot_nom,
        u.username
      FROM mouvements_stock m
      JOIN produits p ON m.produit_id = p.id
      JOIN entrepots e ON m.entrepot_id = e.id
      LEFT JOIN users u ON m.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    if (produitId) {
      params.push(produitId);
      query += ` AND m.produit_id = $${params.length}`;
    }
    if (entrepotId) {
      params.push(entrepotId);
      query += ` AND m.entrepot_id = $${params.length}`;
    }
    
    query += ' ORDER BY m.created_at DESC LIMIT 100';
    
    const result = await pool.query(query, params);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Inventaire - Ajuster le stock
module.exports.ajusterStock = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { produit_id, entrepot_id, nouvelle_quantite, motif } = req.body;
    
    // Récupérer le stock actuel
    const stockResult = await client.query(
      'SELECT quantite FROM stocks WHERE produit_id = $1 AND entrepot_id = $2',
      [produit_id, entrepot_id]
    );
    
    const quantite_avant = stockResult.rows[0]?.quantite || 0;
    const difference = nouvelle_quantite - quantite_avant;
    
    // Enregistrer le mouvement d'inventaire
    await client.query(`
      INSERT INTO mouvements_stock (
        produit_id, entrepot_id, type, quantite,
        quantite_avant, quantite_apres, motif, user_id
      ) VALUES ($1, $2, 'Inventaire', $3, $4, $5, $6, $7)
    `, [
      produit_id, entrepot_id, Math.abs(difference),
      quantite_avant, nouvelle_quantite, motif || 'Ajustement inventaire', req.user?.id
    ]);
    
    // Mettre à jour le stock
    await client.query(`
      INSERT INTO stocks (produit_id, entrepot_id, quantite)
      VALUES ($1, $2, $3)
      ON CONFLICT (produit_id, entrepot_id)
      DO UPDATE SET quantite = $3, updated_at = CURRENT_TIMESTAMP
    `, [produit_id, entrepot_id, nouvelle_quantite]);
    
    await client.query('COMMIT');
    res.status(200).json({ 
      message: 'Stock ajusté avec succès',
      quantite_avant,
      nouvelle_quantite,
      difference
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: error.message });
  } finally {
    client.release();
  }
};