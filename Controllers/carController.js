const Car = require("../models/carModel");
const User = require("../models/userModel");

module.exports.GetAllCars = async (req, res) => {
  try {
    const cars = await Car.find().populate("ownerId");

    if (cars.length == 0) {
      throw new Error("cars not found");
    }

    res.status(200).json(cars);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Créer une nouvelle voiture
module.exports.createCar = async (req, res) => {
  try {
    const { brand, model, year } = req.body;
    const car = new Car({ brand, model, year });
    await car.save();

    res.status(201).json(car);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports.createCarWithOwner = async (req, res) => {
  try {
    const { brand, matricul, year, ownerId } = req.body;
    const car = new Car({ brand, matricul, year, ownerId });
    await car.save();

    // Mettre à jour le modèle d'utilisateur avec l'ID de la voiture
    await User.findByIdAndUpdate(ownerId, { $push: { cars: car._id } });

    res.status(201).json(car);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lire une voiture par son ID
module.exports.getCarById = async (req, res) => {
  try {
    const { id } = req.params;
    const car = await Car.findById(id);
    if (!car) {
      return res.status(404).json({ message: "Voiture introuvable" });
    }
    res.status(200).json(car);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports.deleteCarById = async (req, res) => {
  try {
    const { id } = req.params;
    const car = await Car.findByIdAndDelete(id);
    if (!car) {
      return res.status(404).json({ message: "Voiture introuvable" });
    }

    await User.updateMany({}, { $pull: { cars: car._id } }); //Tab

    //await User.updateMany(car.ownerId,{$set: {car: ""}}) //car

    res.status(200).json(car);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports.buyCar = async (req, res) => {
  try {
    const { IDCar, IdUser } = req.body;

    // Mettre à jour le modèle d'utilisateur avec l'ID de la voiture
    await Car.findByIdAndUpdate(IDCar, { $set: { ownerId: IdUser } });

    // Mettre à jour le modèle d'utilisateur avec l'ID de la voiture
    await User.findByIdAndUpdate(IdUser, { $push: { cars: IDCar } });

    res.status(201).json();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports.sellCar = async (req, res) => {
  try {
    const { IDCar, IdNewUser, IdOldUser } = req.body;


    await User.updateMany(IdOldUser, { $pull: { cars: IDCar } }); //Tab

        // Mettre à jour le modèle d'utilisateur avec l'ID de la voiture
    await User.findByIdAndUpdate(IdNewUser, { $push: { cars: IDCar } });

    // Mettre à jour le modèle d'utilisateur avec l'ID de la voiture
    await Car.findByIdAndUpdate(IDCar, { $set: { ownerId: IdNewUser } });



    res.status(201).json();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
