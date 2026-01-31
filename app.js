var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

const http = require("http");

// Changed from MongoDB to PostgreSQL
const { connectToPostgres } = require("./db/db");

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/usersRouter");
var carRouter = require("./routes/carRouter");

require("dotenv").config();

var app = express();

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/users", usersRouter)
app.use("/cars", carRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  res.status(err.status || 500);
  res.json("error");
});

const server = http.createServer(app);
server.listen(process.env.Port || 5432, () => {
  connectToPostgres(); // Changed function call
  console.log(`app is running on port ${process.env.Port || 5432}`);
});
