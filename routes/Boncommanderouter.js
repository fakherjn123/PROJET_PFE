const express = require("express");
const router = express.Router();
const bonCommandeController = require("../Controllers/Boncommandecontroller");
const { requireAuthUser } = require("../middlewares/authMiddlewares");

// Routes bon de commande
router.get("/", requireAuthUser, bonCommandeController.getAllBonCommandes);
router.get("/:id", requireAuthUser, bonCommandeController.getBonCommandeById);
router.post("/", requireAuthUser, bonCommandeController.createBonCommande);
router.put("/:id/statut", requireAuthUser, bonCommandeController.updateBonCommandeStatut);
router.delete("/:id", requireAuthUser, bonCommandeController.deleteBonCommande);

module.exports = router;