const userModel = require("../models/userModel");

const bcrypt = require("bcrypt");

module.exports.getAllUsers = async (req, res) => {
  try {
    const userList = await userModel
      .find({ age: { $lt: 22 } })
      .sort({ createdAt: -1 })
      .limit(3)
      .populate("cars");
    //const userList = await userModel.find().sort("age")

    const user = req.user;
    console.log(user);

    if (userList.length == 0) {
      throw new Error("Users not found");
    }

    res.status(200).json(userList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userModel.findById(id);

    if (!user) {
      throw new Error("User not found");
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports.deleteUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userModel.findByIdAndDelete(id);

    if (!user) {
      throw new Error("User not found");
    }

    res.status(200).json("deleted");
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports.getUserByEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await userModel.find({ email: email });

    if (!user) {
      throw new Error("User not found");
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports.addClient = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const roleClient = "client";
    const user = new userModel({
      name,
      email,
      password,
      role: roleClient,
    });
    const userAdded = await user.save();
    res.status(200).json(userAdded);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports.addAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const roleClient = "admin";
    const user = new userModel({
      name,
      email,
      password,
      role: roleClient,
    });
    const userAdded = await user.save();
    res.status(200).json(userAdded);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { age, name } = req.body;
    const user = await userModel.findById(id);
    if (!user) {
      throw new Error("User not found");
    }

    const updated = await userModel.findByIdAndUpdate(id, {
      $set: { name, age },
    });

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports.updatePassword = async (req, res) => {
  try {
    const id  = req.user._id;
    const { newPassword } = req.body;
    const user = await userModel.findById(id);
    if (!user) {
      throw new Error("User not found");
    }

    const salt = await bcrypt.genSalt();

    const isSamePassword = await bcrypt.compare(newPassword, user.password);

    const newPasswordhashed = await bcrypt.hash(newPassword, salt);

    if (isSamePassword) {
      throw new Error("probleme same password");
    }

    const updated = await userModel.findByIdAndUpdate(id, {
      $set: { password: newPasswordhashed },
    });

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports.addClientWithImg = async (req, res) => {
  try {
    const UserData = { ...req.body };

    UserData.role = "client";

    if (req.file) {
      const { filename } = req.file;
      UserData.image_User = filename;
    }
    const user = new userModel(UserData);
    const userAdded = await user.save();
    res.status(200).json(userAdded);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const jwt = require("jsonwebtoken");

const createToken = (id) => {
  return jwt.sign({ id }, "net 9antra secret", { expiresIn: "1h" });
};

module.exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await userModel.login(email, password);
    //
    const token = createToken(user._id);
    //eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NWZhYzViNWI3MzlkMGZkM2NhZTBjYSIsImlhdCI6MTc1MTEwMTQxMywiZXhwIjoxNzUxMTAxNDczfQ.hpMDmfaICCsaBbCXm1copE7QMK74uRMLPdTt36zQYMc

    await userModel.findByIdAndUpdate({_id: user._id},{connected :true})

    res.cookie("jwt_Token", token, { httpOnly: true, maxAge: 3600 * 1000 });
    res
      .status(200)
      .json({ message: "Usersuccessfully authenticated", user: user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports.logout = async (req, res) => {
  try {
    const updatedUser = await userModel.findByIdAndUpdate(
      { _id: req.user._id },
      { connected: false }
    );

    res.cookie("jwt_Token", "", { httpOnly: true, maxAge: 1 });
    res.status(200).json({ message: "User successfully logged out" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
