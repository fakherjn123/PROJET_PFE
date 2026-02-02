const express = require("express");
const router = express.Router();
const clientsController = require("../Controllers/clientsController");
const { requireAuthUser } = require("../middlewares/authMiddlewares");

// Routes clients
router.get("/", requireAuthUser, clientsController.getAllClients);
router.get("/:id", requireAuthUser, clientsController.getClientById);
router.post("/", requireAuthUser, clientsController.createClient);
router.put("/:id", requireAuthUser, clientsController.updateClient);
router.delete("/:id", requireAuthUser, clientsController.deleteClient);

module.exports = router;