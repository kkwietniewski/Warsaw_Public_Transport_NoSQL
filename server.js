const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(__dirname + "/styles"));

app.set("views", path.join(__dirname, "./views"));
app.set("view engine", "ejs");

app.engine("html", require("ejs").renderFile);

const runServer = (port) => {
  app.listen(port, () => {
    console.log(`Port: ${port}`);
  });
};

module.exports = { runServer, app };
