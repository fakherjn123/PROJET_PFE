const express = require("express");
const router = express.Router();
const fournisseursController = require("../Controllers/fournisseursController");
const { requireAuthUser } = require("../middlewares/authMiddlewares");

// Routes fournisseurs
router.get("/", requireAuthUser, fournisseursController.getAllFournisseurs);
router.get("/:id", requireAuthUser, fournisseursController.getFournisseurById);
router.post("/", requireAuthUser, fournisseursController.createFournisseur);
router.put("/:id", requireAuthUser, fournisseursController.updateFournisseur);
router.delete("/:id", requireAuthUser, fournisseursController.deleteFournisseur);

module.exports = router;