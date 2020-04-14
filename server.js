const express = require("express");
var https = require("https");
const MongoClient = require("mongodb").MongoClient;
const app = express();
var fs = require("fs");
const cors = require("cors");
var privateKey = fs.readFileSync("privkey.pem", "utf8");
var certificate = fs.readFileSync("fullchain.pem", "utf8");

const port = 21212;
var whitelist = [
  "http://bot.mrguinas.com.br",
  "https://bot.mrguinas.com.br",
  "http://localhost:3000"
];
var corsOptions = {
  origin: function(origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  }
};
app.use(cors());
app.use(express.json());

var credentials = { key: privateKey, cert: certificate };

const server = https.createServer(credentials, app).listen(port, function() {
  console.log(`Server listening on port ${port}!`); // The server object listens on port 3000
});

const url = "mongodb://root:Canygra01@144.202.41.172:27017/?authSource=admin";
const dbName = "mrguinas";
let col = null;

MongoClient.connect(
  url,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true
  },
  function(err, client) {
    if (err) {
      console.log(err);
    }
    mongoClient = client.db(dbName);
    col = mongoClient.collection("remote");
    console.log("Mongo connected");
  }
);
app.post("/remote", (req, res) => {
  col = mongoClient.collection("remote");
  col.insertOne(req.body, (err, item) => {
    if (err) res.send(400);
    res.json(req.body);
  });
});

app.get("/remote", (req, res) => {
  col = mongoClient.collection("remote");
  col.find().toArray((err, list) => {
    if (err) res.send(400);
    if (list.length > 0) {
      col.drop().then(() => {
        res.send(list);
      });
    } else {
      res.send(list);
    }
  });
});

app.post("/userDonnation", (req, res) => {
  col = mongoClient.collection("userDonnation");
  col.insertOne(req.body, (err, item) => {
    if (err) res.send(400);
    res.json(req.body);
  });
});

app.get("/userDonnation", (req, res) => {
  col = mongoClient.collection("userDonnation");
  col.find().toArray((err, list) => {
    if (err) res.send(400);
    res.send(list);
  });
});

app.delete("/userDonnation", (req, res) => {
  col = mongoClient.collection("userDonnation");
  col.deleteMany({}, (err, item) => {
    if (err) res.send(400);
    res.json(req.body);
  });
});

app.post("/meta", (req, res) => {
  col = mongoClient.collection("meta");
  let json = req.body;
  json.type = "meta";
  console.log(json);
  col.replaceOne({ type: "meta" }, json, { upsert: true }, (err, item) => {
    if (err) res.send(400);
    res.json(json);
  });
});

app.get("/meta", (req, res) => {
  col = mongoClient.collection("meta");
  col.findOne({ type: "meta" }, (err, item) => {
    if (err) res.send(400);
    res.send(item);
  });
});
