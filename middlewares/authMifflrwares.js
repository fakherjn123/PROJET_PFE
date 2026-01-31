const { pool } = require("../db/db");
const jwt = require("jsonwebtoken");

const requireAuthUser = (req, res, next) => {
  const token = req.cookies.jwt_Token;
  console.log("token", token);

  if (token) {
    jwt.verify(token, "net 9antra secret", async (err, decodedToken) => {
      if (err) {
        res.json("*Probleme_Token");
      } else {
        // بدل Mongo
        const result = await pool.query(
          "SELECT * FROM users WHERE id = $1",
          [decodedToken.id]
        );

        req.user = result.rows[0];
        next();
      }
    });
  } else {
    res.json("Pas de Token");
  }
};

module.exports = { requireAuthUser };
