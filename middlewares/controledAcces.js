

const controledAcces = async (req, res, next) => {
  if (req.user.role === "admin") {
    next();
  } else {
    res.status(401).json("Unauthorized");
  }
};

module.exports = {controledAcces}