var fs = require("fs");
var readline = require("readline");
var { google } = require("googleapis");
var OAuth2 = google.auth.OAuth2;
const axios = require("axios");

let videoId = "0cFuJWoXapc";

//Video de teste
// videoId = "5OTRxsvEUks";

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/youtube-nodejs-quickstart.json
var SCOPES = [
  "https://www.googleapis.com/auth/youtube.channel-memberships.creator"
];
var TOKEN_DIR =
  (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) +
  "/.credentials/";
var TOKEN_PATH = "./youtube-nodejs-quickstart.json";

// Load client secrets from a local file.
function start() {
  console.log("List Members");
  fs.readFile("client.json", function processClientSecrets(err, content) {
    if (err) {
      console.log("Error loading client secret file: " + err);
      return;
    }
    // Authorize a client with the loaded credentials, then call the YouTube API.
    authorize(JSON.parse(content), getMembers);
  });
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES
  });
  console.log("Authorize this app by visiting this url: ", authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question("Enter the code from that page here: ", function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log("Error while trying to retrieve access token", err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != "EEXIST") {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token), err => {
    if (err) throw err;
    console.log("Token stored to " + TOKEN_PATH);
  });
}

let qntLikes = 0;
/**
 * Lists the names and IDs of up to 10 files.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function getMembers(auth) {
  var service = google.youtube("v3");

  service.members.list(
    {
      auth: auth,
      part: "snippet",
      mode: "all_current"
    },
    async function(err, response) {
      if (err) {
        console.log("The API returned an error: " + err);
        return;
      }
      console.log(response.data.items);
    }
  );
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
start();
