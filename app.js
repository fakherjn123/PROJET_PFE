var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const cors = require("cors");
const http = require("http");

// Database connection - CORRECTION: import correct
const { connectToPostgres } = require("./db");

// Import routers
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

// Middlewares
app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Routes
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

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  res.status(err.status || 500);
  res.json({ error: err.message });
});

const server = http.createServer(app);
const PORT = process.env.Port || 5000;

server.listen(PORT, () => {
  connectToPostgres();
  console.log(`🚀 BMZ CRM Server running on port ${PORT}`);
  console.log(`📊 Database: PostgreSQL`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;