const express = require("express");
const router = express.Router();
const usersController = require("../Controllers/usersController");
const { requireAuthUser } = require("../middlewares/authMiddlewares");
const { controledAcces } = require("../middlewares/controledAcces");

// Public
router.post("/addClient", usersController.addClient);
router.post("/addAdmin", usersController.addAdmin);
router.post("/login", usersController.loginUser);

// Protected
router.get("/getUserById/:id", requireAuthUser, usersController.getUserById);
router.put("/updatePassword", requireAuthUser, usersController.updatePassword);
router.post("/logout", requireAuthUser, usersController.logout);

// Admin
router.get("/getAllUsers", requireAuthUser, controledAcces, usersController.getAllUsers);
router.put("/updateUser/:id", requireAuthUser, controledAcces, usersController.updateUser);
router.delete("/deleteUserById/:id", requireAuthUser, controledAcces, usersController.deleteUserById);

module.exports = router;
