const express = require("express");
var https = require("https");
const MongoClient = require("mongodb").MongoClient;
const app = express();
var fs = require("fs");
const cors = require("cors");
var privateKey = fs.readFileSync("privkey.pem", "utf8");
var certificate = fs.readFileSync("fullchain.pem", "utf8");
const socketIo = require("socket.io");
const ioClient = require("socket.io-client");

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

const io = socketIo(server);
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
    } else {
      mongoClient = client.db(dbName);
      col = mongoClient.collection("remote");
      console.log("Mongo connected");
    }
  }
);

app.post("/remote", (req, res) => {
  col = mongoClient.collection("remote");
  col.insertOne(req.body, (err, item) => {
    if (err) res.sendStatus(400);
    else res.json(req.body);
  });
});

app.get("/remote", (req, res) => {
  col = mongoClient.collection("remote");
  col.find().toArray((err, list) => {
    if (err) res.sendStatus(400);
    else if (list.length > 0) {
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
    if (err) res.sendStatus(400);
    else res.json(req.body);
  });
});

app.get("/userDonnation", (req, res) => {
  col = mongoClient.collection("userDonnation");
  col.find().toArray((err, list) => {
    if (err) res.sendStatus(400);
    else res.send(list);
  });
});

app.delete("/userDonnation", (req, res) => {
  col = mongoClient.collection("userDonnation");
  col.deleteMany({}, (err, item) => {
    if (err) res.sendStatus(400);
    else res.json(req.body);
  });
});

app.put("/meta", (req, res) => {
  col = mongoClient.collection("meta");
  let json = req.body;

  col.updateOne(
    { type: "meta" },
    { $inc: { apurado: json.amount } },
    (err, item) => {
      //console.log(err, json.amount);
      if (err) res.sendStatus(400);
      else res.json(item);
    }
  );
});

app.post("/meta", (req, res) => {
  col = mongoClient.collection("meta");
  let json = req.body;
  json.type = "meta";
  console.log(json);
  col.replaceOne({ type: "meta" }, json, { upsert: true }, (err, item) => {
    if (err) res.sendStatus(400);
    else res.json(json);
  });
});

app.get("/meta", (req, res) => {
  col = mongoClient.collection("meta");
  col.findOne({ type: "meta" }, (err, item) => {
    if (err) res.sendStatus(400);
    else res.send(item);
  });
});

function writeInfestacao(infestacao) {
  col = mongoClient.collection("bot");
  let json = infestacao;
  json.type = "infestacao";
  //console.log(json);
  col.replaceOne(
    { type: json.type },
    json,
    { upsert: true },
    (err, item) => {}
  );
}
function getInfestacao() {
  return new Promise((resolve, reject) => {
    mongoClient
      .collection("bot")
      .findOne({ type: "infestacao" }, (err, item) => {
        if (err) reject(err);
        else resolve(item);
      });
  });
}
function getBomb() {
  return new Promise((resolve, reject) => {
    mongoClient.collection("bot").findOne({ type: "bomb" }, (err, item) => {
      if (err) reject(err);
      else resolve(item);
    });
  });
}

let infestacaoControler = new Map();
let infestacaoWatchers = new Map();
let bombControler = new Map();
let bombWatchers = new Map();
io.on("connection", async socket => {
  console.info(`Connected [id=${socket.id}]`);
  socket.on("setInfestacao", infestacao => {
    console.info(`SetInfestacao [id=${socket.id}]`);
    //console.log(bomb);
    infestacaoControler.set(socket, infestacao);
    writeInfestacao(infestacao);
    notifyInfestacao(infestacao);
  });
  socket.on("setBomb", bomb => {
    console.info(`SetBomb [id=${socket.id}]`);
    //console.log(bomb);
    bombControler.set(socket, bomb);
    writeBomb(bomb);
    notifyBomb(bomb);
  });
  socket.on("registerBombWatcher", bomb => {
    console.info(`Registered bombWatcher [id=${socket.id}]`);
    getBomb().then(bombMongo => {
      socket.emit("bomb", bombMongo);
    });
    bombWatchers.set(socket);
  });
  socket.on("registerInfestacaoWatcher", infestacao => {
    console.info(`Registered infestacaoWatcher [id=${socket.id}]`);
    getInfestacao().then(infestacaoMongo => {
      socket.emit("infestacao", infestacaoMongo);
    });
    infestacaoWatchers.set(socket);
  });
  socket.on("disconnect", () => {
    disconnectClient(socket);
  });
});
function notifyBomb(bomb) {
  bombWatchers.forEach((key, socket) => {
    if (socket) {
      console.log("Emitting bomb");
      socket.emit("bomb", bomb);
    }
  });
}
function notifyInfestacao(infestacao) {
  infestacaoWatchers.forEach((key, socket) => {
    if (socket) {
      console.log("Emitting infestacao");
      socket.emit("infestacao", infestacao);
    }
  });
}

function disconnectClient(socket) {
  infestacaoControler.delete(socket);
  bombControler.delete(socket);
  bombWatchers.delete(socket);
  infestacaoWatchers.delete(socket);
  console.info(`DISCONNECTED [id=${socket.id}]`);
}
