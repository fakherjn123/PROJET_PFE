var express = require("express");
var router = express.Router();
const carController = require("../Controllers/carController")

/* GET users listing. */

router.get("/GetAllCars",carController.GetAllCars);

router.post("/createCarWithOwner",carController.createCarWithOwner);

module.exports = router;
