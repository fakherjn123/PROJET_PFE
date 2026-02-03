var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const cors = require("cors");
const http = require("http");

// Database
const { connectToPostgres } = require("./db");

// Routers
var indexRouter = require("./routes/index");
var usersRouter = require("./routes/usersRouter");
var produitsRouter = require("./routes/produitsRouter");
var Stockrouter = require("./routes/Stockrouter");
var bonCommandeRouter = require("./routes/Boncommanderouter");
var factureRouter = require("./routes/Facturerouter");
var tresorerieRouter = require("./routes/Tresorerierouter");
var carRouter = require("./routes/carRouter");
var clientsRouter = require("./routes/clientsRouter");
var fournisseursRouter = require("./routes/fournisseursRouter");
var entrepotsRouter = require("./routes/entrepotsRouter");

require("dotenv").config();

var app = express();

/* =======================
   MIDDLEWARES
======================= */

// CORS (sans frontend – Postman)
app.use(cors({
  origin: "*",
  credentials: true
}));

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

/* =======================
   ROUTES
======================= */

app.use("/", indexRouter);
app.use("/api/users", usersRouter);
app.use("/api/produits", produitsRouter);
app.use("/api/stocks", Stockrouter);
app.use("/api/bon-commandes", bonCommandeRouter);
app.use("/api/factures", factureRouter);
app.use("/api/tresorerie", tresorerieRouter);
app.use("/api/cars", carRouter);
app.use("/api/clients", clientsRouter);
app.use("/api/fournisseurs", fournisseursRouter);
app.use("/api/entrepots", entrepotsRouter);

/* =======================
   ERRORS
======================= */

// 404
app.use(function (req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.json({
    message: err.message,
    error: process.env.NODE_ENV === "development" ? err : {}
  });
});

/* =======================
   SERVER
======================= */

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
server.listen(PORT, () => {
  connectToPostgres();
  console.log(`🚀 BMZ CRM Server running on port ${PORT}`);
});

module.exports = app;
