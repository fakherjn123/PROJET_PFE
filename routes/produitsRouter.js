const express = require("express");
const router = express.Router();
const produitController = require("../Controllers/produitController");

// Get all produits
router.get("/", produitController.getAllProduits);

// Get produit by id
router.get("/:id", produitController.getProduitById);

// Create produit
router.post("/", produitController.createProduit);

// Update produit
router.put("/:id", produitController.updateProduit);

// Delete produit
router.delete("/:id", produitController.deleteProduit);

module.exports = router;
