const express = require("express");
var https = require("https");
const MongoClient = require("mongodb").MongoClient;
const app = express();
var fs = require("fs");
const cors = require("cors");
const socketIo = require("socket.io");
const ioClient = require("socket.io-client");
const axios = require("axios");

const privateKey = fs.readFileSync(
  "/etc/letsencrypt/live/multistreamer.xyz/privkey.pem",
  "utf8"
);
const certificate = fs.readFileSync(
  "/etc/letsencrypt/live/multistreamer.xyz/cert.pem",
  "utf8"
);
const ca = fs.readFileSync(
  "/etc/letsencrypt/live/multistreamer.xyz/chain.pem",
  "utf8"
);
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
  let liveId = req.body.liveId;
  col = mongoClient.collection("userDonnation");
  col.deleteMany({ liveId: { $ne: liveId } }, (err, item) => {
    if (err) res.sendStatus(400);
    else {
      col.insertOne(req.body, (err, item) => {
        if (err) res.sendStatus(400);
        else res.json(req.body);
      });
    }
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

app.get("/patrocinadores", (req, res) => {
  col = mongoClient.collection("userDonnation");
  col
    .aggregate([
      {
        $group: {
          _id: "$channelId",
          name: { $first: "$name" },
          avatar: { $first: "$avatar" },
          amount: {
            $sum: "$amount"
          }
        }
      },
      {
        $sort: {
          amount: -1
        }
      }
    ])
    .toArray((err, list) => {
      if (err) res.sendStatus(400);
      else {
        let finalResult = [];
        list.forEach(user => {
          if (user.amount >= 100) {
            finalResult.push(user);
          }
        });
        res.send(finalResult);
      }
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
let isSetColor = false;
app.get("/setColor/:idColor", (req, res) => {
  let idColor = req.params.idColor;
  if (idColor <= 6 && idColor >= 0) {
    getToken().then(token => {
      if (!isSetColor) {
        isSetColor = true;
        let cor = colors[idColor];
        console.log(`Change color: ${cor.name}`);
        changeColor(cor, token);
        res.send(`Change Color: ${cor.name}`);
      } else {
        isSetColor = false;
        console.log(`Reset color`);
        changeColor(nowColor, token);
        res.send("Reset Color");
      }
    });
  } else {
    isSetColor = false;
    res.send("Color not found");
  }
});

let timerColor = null;
app.get("/changeColor", (req, res) => {
  getToken().then(token => {
    if (timerColor === null) {
      timerColor = setInterval(async () => {
        await changeColor(colors[getRandomInt(0, colors.length - 1)], token);
      }, 500);
      console.log("Bulb: started");
      res.send("started");
    } else {
      clearInterval(timerColor);
      timerColor = null;
      setInterval(async () => {
        await changeColor(nowColor, token);
      }, 500);
      console.log("Bulb: stoped");
      res.send("stoped");
    }
  });
});

async function getToken() {
  return new Promise(resolve => {
    var settings = {
      url: "https://wap.tplinkcloud.com/",
      method: "POST",
      timeout: 0,
      headers: {
        "Content-Type": "application/json"
      },
      data: JSON.stringify({
        method: "login",
        params: {
          appType: "Kasa_Android",
          cloudUserName: "alexandrevl@gmail.com",
          cloudPassword: "12345678",
          terminalUUID: "377c4b28-cfad-439e-b885-7a749baab03b"
        }
      })
    };
    axios(settings).then(response => {
      // console.log(response.data);
      let tokenTpLink = response.data.result.token;
      resolve(tokenTpLink);
    });
  });
}
let nowColor = {
  name: "live",
  hue: 0,
  saturation: 0,
  brightness: 0,
  temp: 5000
};

var colors = [
  {
    name: "red",
    hue: 0,
    saturation: 100,
    brightness: 80,
    temp: 0
  },
  {
    name: "blue",
    hue: 240,
    saturation: 100,
    brightness: 80,
    temp: 0
  },
  {
    name: "green",
    hue: 120,
    saturation: 100,
    brightness: 80,
    temp: 0
  },
  {
    name: "orange",
    hue: 30,
    saturation: 100,
    brightness: 80,
    temp: 0
  },
  {
    name: "pink",
    hue: 330,
    saturation: 100,
    brightness: 80,
    temp: 0
  },
  {
    name: "purple",
    hue: 276,
    saturation: 100,
    brightness: 60,
    temp: 0
  }
];
//Sala
// let deviceId = "80120D52725F115812C58D0E677DA553187D9A56";
//MrGuinas
let deviceId = "8012754D40A51DFD7DC639AEB17B346118AE7228";
function changeColor(color, tokenTpLink) {
  return new Promise(resolve => {
    var settings = {
      url: `https://use1-wap.tplinkcloud.com/?token=${tokenTpLink}`,
      method: "POST",
      timeout: 0,
      headers: {
        "Content-Type": "application/json"
      },
      data: JSON.stringify({
        method: "passthrough",
        params: {
          deviceId: deviceId,
          requestData: `{"smartlife.iot.smartbulb.lightingservice":{"transition_light_state":{"ignore_default":1,"transition_period":150,"mode":"normal","hue":${color.hue},"on_off":1,"saturation":${color.saturation},"color_temp":${color.temp},"brightness":${color.brightness}}}}`
        }
      })
    };

    axios(settings).then(response => {
      // console.log(response);
      resolve(true);
    });
  });
}

function incRemote(msg) {
  mongoClient.collection("remote").insertOne(msg, (err, item) => {});
}

function writeInfestacao(infestacao) {
  let json = infestacao;
  json.type = "infestacao";
  mongoClient
    .collection("bot")
    .replaceOne({ type: json.type }, json, { upsert: true }, (err, item) => {});
}
function writeBomb(bomb) {
  let json = bomb;
  json.type = "bomb";
  //console.log(json);
  mongoClient
    .collection("bot")
    .replaceOne({ type: json.type }, json, { upsert: true }, (err, item) => {});
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
function getRemote() {
  return new Promise((resolve, reject) => {
    mongoClient
      .collection("remote")
      .find()
      .toArray((err, list) => {
        if (err) reject(err);
        else if (list.length > 0) {
          mongoClient
            .collection("remote")
            .drop()
            .then(() => {
              resolve(list);
            });
        } else {
          resolve(list);
        }
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
let remoteWatchers = new Map();
io.on("connection", async socket => {
  console.info(`Connected [id=${socket.id}]`);
  socket.on("setInfestacao", infestacao => {
    console.info(`SetInfestacao [id=${socket.id}]`);
    //console.log(bomb);
    infestacaoControler.set(socket, infestacao);
    writeInfestacao(infestacao);
    notifyInfestacao(infestacao);
  });
  socket.on("addRemote", msg => {
    console.info(`AddRemote [id=${socket.id}]`);
    notifyRemote(msg);
  });
  socket.on("setBomb", bomb => {
    console.info(`SetBomb [id=${socket.id}]`);
    //console.log(bomb);
    bombControler.set(socket, bomb);
    writeBomb(bomb);
    notifyBomb(bomb);
  });
  socket.on("registerRemoteWatcher", () => {
    console.info(`Registered remoteWatcher [id=${socket.id}]`);
    getRemote().then(list => {
      socket.emit("remoteMsg", list);
    });
    remoteWatchers.set(socket);
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
function notifyRemote(msg) {
  let isRemoteConnected = false;
  remoteWatchers.forEach((key, socket) => {
    if (socket) {
      //console.log("Emitting remote msg");
      isRemoteConnected = true;
      socket.emit("remoteMsg", [msg]);
    }
  });
  if (!isRemoteConnected) {
    incRemote(msg);
  }
}

function disconnectClient(socket) {
  infestacaoControler.delete(socket);
  bombControler.delete(socket);
  bombWatchers.delete(socket);
  infestacaoWatchers.delete(socket);
  remoteWatchers.delete(socket);
  console.info(`DISCONNECTED [id=${socket.id}]`);
}

function getRandomInt(min, max) {
  //console.log(min,max);
  if (Math.ceil(min) == Math.floor(max)) {
    return min;
  } else {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
