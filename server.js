const express = require("express");
const http = require("http");
const MongoClient = require("mongodb").MongoClient;
const app = express();
const cors = require("cors");

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

const server = http.createServer(app).listen(port, function() {
  console.log(`Server listening on port ${port}!`); // The server object listens on port 3000
});

const url = "mongodb://root:Canygra01@144.202.41.172:27017/?authSource=admin";
const dbName = "remote";
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
  col.insertOne(req.body, (err, item) => {
    res.json(req.body);
  });
});

app.get("/remote", (req, res) => {
  col.find().toArray((err, list) => {
    if (list.length > 0) {
      col.drop().then(() => {
        res.send(list);
      });
    } else {
      res.send(list);
    }
  });
});
