const express = require("express");
const router = express.Router();
const factureController = require("../Controllers/Facturecontroller");
const { requireAuthUser } = require("../middlewares/authMiddlewares");

// Routes factures
router.get("/", requireAuthUser, factureController.getAllFactures);
router.get("/impayees", requireAuthUser, factureController.getFacturesImpayees);
router.get("/:id", requireAuthUser, factureController.getFactureById);
router.post("/", requireAuthUser, factureController.createFacture);
router.post("/:id/paiement", requireAuthUser, factureController.enregistrerPaiement);
router.delete("/:id", requireAuthUser, factureController.deleteFacture);

module.exports = router;