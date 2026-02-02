const express = require("express");
const router = express.Router();
const entrepotsController = require("../Controllers/entrepotsController");
const { requireAuthUser } = require("../middlewares/authMiddlewares");

// Routes entrepôts
router.get("/", requireAuthUser, entrepotsController.getAllEntrepots);
router.get("/:id", requireAuthUser, entrepotsController.getEntrepotById);
router.post("/", requireAuthUser, entrepotsController.createEntrepot);
router.put("/:id", requireAuthUser, entrepotsController.updateEntrepot);
router.delete("/:id", requireAuthUser, entrepotsController.deleteEntrepot);

module.exports = router;