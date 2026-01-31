var express = require("express");
var router = express.Router();
const userController = require("../Controllers/userController")

const uploadfile = require("../middlewares/uploadFileMiddlewares")
const {requireAuthUser} = require("../middlewares/authMifflrwares")
const {controledAcces} = require("../middlewares/controledAcces")

/* GET users listing. */

router.get("/getAllUsers",requireAuthUser,controledAcces,userController.getAllUsers);

router.get("/getUserById/:id",requireAuthUser,userController.getUserById);

router.post("/addClient",userController.addClient);

router.post("/addClientWithImg",uploadfile.single("image_User"),userController.addClientWithImg);

router.post("/addAdmin",userController.addAdmin);

router.post("/getUserByEmail",requireAuthUser,controledAcces,userController.getUserByEmail);

router.post("/login",userController.loginUser);

router.post("/logout",requireAuthUser,userController.logout);

router.put("/updateUser/:id",requireAuthUser,controledAcces,userController.updateUser);

router.put("/updatePassword",requireAuthUser,userController.updatePassword);

router.delete("/deleteUserById/:id",requireAuthUser,controledAcces,userController.deleteUserById);


module.exports = router;
