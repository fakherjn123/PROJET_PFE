const { pool } = require("../db/db");

// Get all cars with owner info
module.exports.GetAllCars = async (req, res) => {
  try {
    const query = `
      SELECT c.*, u.nom as owner_nom, u.email as owner_email 
      FROM cars c 
      LEFT JOIN users u ON c.owner_id = u.id
      WHERE c.is_active = true
    `;
    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create car without owner
module.exports.createCar = async (req, res) => {
  try {
    const { brand, model, year, matricul } = req.body;
    
    const result = await pool.query(
      `INSERT INTO cars (brand, model, year, matricul, created_at) 
       VALUES ($1, $2, $3, $4, NOW()) 
       RETURNING *`,
      [brand, model, year, matricul]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create car with owner
module.exports.createCarWithOwner = async (req, res) => {
  try {
    const { brand, matricul, year, ownerId } = req.body;
    
    // Verify owner exists
    const userCheck = await pool.query("SELECT id FROM users WHERE id = $1", [ownerId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: "Propriétaire non trouvé" });
    }
    
    // Insert car
    const carResult = await pool.query(
      `INSERT INTO cars (brand, matricul, year, owner_id, created_at) 
       VALUES ($1, $2, $3, $4, NOW()) 
       RETURNING *`,
      [brand, matricul, year, ownerId]
    );
    
    res.status(201).json(carResult.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get car by ID
module.exports.getCarById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT c.*, u.nom as owner_nom, u.email as owner_email 
       FROM cars c 
       LEFT JOIN users u ON c.owner_id = u.id 
       WHERE c.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Voiture introuvable" });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete car (soft delete)
module.exports.deleteCarById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      "UPDATE cars SET is_active = false WHERE id = $1 RETURNING *",
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Voiture introuvable" });
    }
    
    res.status(200).json({ message: "Voiture supprimée", car: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Buy car
module.exports.buyCar = async (req, res) => {
  try {
    const { IDCar, IdUser } = req.body;
    
    // Check if car exists and is available
    const carCheck = await pool.query(
      "SELECT * FROM cars WHERE id = $1 AND is_active = true",
      [IDCar]
    );
    
    if (carCheck.rows.length === 0) {
      return res.status(404).json({ message: "Voiture non disponible" });
    }
    
    // Update car owner
    await pool.query(
      "UPDATE cars SET owner_id = $1, updated_at = NOW() WHERE id = $2",
      [IdUser, IDCar]
    );
    
    res.status(200).json({ message: "Achat effectué avec succès" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Sell car
module.exports.sellCar = async (req, res) => {
  try {
    const { IDCar, IdNewUser, IdOldUser } = req.body;
    
    // Verify car belongs to old owner
    const carCheck = await pool.query(
      "SELECT * FROM cars WHERE id = $1 AND owner_id = $2",
      [IDCar, IdOldUser]
    );
    
    if (carCheck.rows.length === 0) {
      return res.status(400).json({ message: "Cette voiture n'appartient pas à ce vendeur" });
    }
    
    // Transfer ownership
    await pool.query(
      "UPDATE cars SET owner_id = $1, updated_at = NOW() WHERE id = $2",
      [IdNewUser, IDCar]
    );
    
    res.status(200).json({ message: "Vente effectuée avec succès" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};