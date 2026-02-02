const express = require("express");
const router = express.Router();
const carController = require("../Controllers/carController");
const { requireAuthUser } = require("../middlewares/authMiddlewares");

router.get("/GetAllCars", requireAuthUser, carController.GetAllCars);
router.post("/createCar", requireAuthUser, carController.createCar);
router.post("/createCarWithOwner", requireAuthUser, carController.createCarWithOwner);
router.get("/:id", requireAuthUser, carController.getCarById);
router.delete("/:id", requireAuthUser, carController.deleteCarById);
router.post("/buy", requireAuthUser, carController.buyCar);
router.post("/sell", requireAuthUser, carController.sellCar);

module.exports = router;