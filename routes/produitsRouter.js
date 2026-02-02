const express = require("express");
const router = express.Router();
const produitController = require("../Controllers/produitController");
const { requireAuthUser } = require("../middlewares/authMiddlewares");

// Get all produits (protégé)
router.get("/", requireAuthUser, produitController.getAllProduits);

// Get produit by id
router.get("/:id", requireAuthUser, produitController.getProduitById);

// Create produit
router.post("/", requireAuthUser, produitController.createProduit);

// Update produit
router.put("/:id", requireAuthUser, produitController.updateProduit);

// Delete produit (soft delete)
router.delete("/:id", requireAuthUser, produitController.deleteProduit);

module.exports = router;