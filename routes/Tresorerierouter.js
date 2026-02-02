const express = require("express");
const router = express.Router();
const tresorerieController = require("../Controllers/Tresoreriecontroller");
const { requireAuthUser } = require("../middlewares/authMiddlewares");

// Routes caisse
router.get("/caisses", requireAuthUser, tresorerieController.getAllCaisses);
router.post("/caisses", requireAuthUser, tresorerieController.createCaisse);

// Routes comptes bancaires
router.get("/comptes-bancaires", requireAuthUser, tresorerieController.getAllComptesBancaires);
router.post("/comptes-bancaires", requireAuthUser, tresorerieController.createCompteBancaire);

// Routes transactions
router.get("/transactions", requireAuthUser, tresorerieController.getAllTransactions);
router.post("/transactions", requireAuthUser, tresorerieController.createTransaction);
router.delete("/transactions/:id", requireAuthUser, tresorerieController.deleteTransaction);

// Statistiques
router.get("/statistiques", requireAuthUser, tresorerieController.getStatistiquesTresorerie);

// Transferts
router.post("/transfert", requireAuthUser, tresorerieController.transfertComptes);

module.exports = router;