const express = require("express");
const router = express.Router();
const Stockcontroller = require("../Controllers/Stockcontroller");
const { requireAuthUser } = require("../middlewares/authMiddlewares");

// Routes stocks
router.get("/", requireAuthUser, Stockcontroller.getAllStocks);
router.get("/produit/:produitId", requireAuthUser, Stockcontroller.getStockByProduit);
router.post("/", requireAuthUser, Stockcontroller.updateStock);
router.post("/mouvement", requireAuthUser, Stockcontroller.createMouvementStock);
router.post("/ajuster", requireAuthUser, Stockcontroller.ajusterStock);
router.get("/mouvements", requireAuthUser, Stockcontroller.getMouvementsStock);

module.exports = router;