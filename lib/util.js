import crypto from 'crypto';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import { client as WebSocketClient }  from 'websocket';


//Initialize .env
dotenv.config();
const encryption = {
  algorithm: process.env.SYMMETRIC_ENCRYPTION,
  plainEncoding: process.env.PLAIN_ENCODING,
  encryptedEncoding: process.env.ENCRYPTED_ENCODING
};


export const ENDPOINTS = {
  // SECURITY_SERVICE: "http://localhost:3003",
  SECURITY_SERVICE: "http://192.168.1.17:3003",
  DIRECTORY_SERVICE: "http://localhost:3001",
  // LOCK_SERVER: "http://localhost:3002",
  LOCK_SERVER: "http://192.168.1.17:3002",
  CACHING_SERVER: "http://localhost:3004",
  CACHING_SERVER_WS: "ws://localhost:3004",
};

const name = process.argv[3];
export let FILES_DIR = path.join(__dirname,`/../users/${name}/remoteFiles/`);
export let CLIENT_KEY_LOCATION =  path.join(__dirname,`/../users/${name}/clientKey.txt`);



let ticket, sessionKey;
export function setAuthTokens(givenTicket, givenSessionKey) {
  ticket = givenTicket;
  sessionKey = givenSessionKey;
}


/**
 * Makes a request to the specified endpoint
 * @param endpoint URL to hit
 * @param method HTTP Verb
 * @param body (optional if POST/PUT)
 * @returns {Promise.<{ok: *, status: *, response: *}>}
 */
export async function makeRequest(endpoint, method, body) {
  const headers =  {'Content-Type': 'application/json', 'Authorization': ticket};
  let response;
  if(body) {
    if(sessionKey) {
      console.log(`Making request to ${endpoint} - encrypting`);
      const encrypted = encrypt(JSON.stringify(body), sessionKey);
      response = await fetch(endpoint, {
        method,
        body: JSON.stringify({encrypted: encrypted}),   // hacky but body: {encrypted} doesnt work
        headers

      });
    } else {
      response = await fetch(endpoint, {method, body: JSON.stringify(body), headers});
    }
  } else {
    response = await fetch(endpoint, {method, headers})
  }

  const { ok, status } = response;

  const contentType = response.headers.get("content-type");
  if(contentType && contentType.indexOf("application/json") !== -1) {
    response = await response.json();
  }

  return {ok, status, response}

}


/**
 * Uploads file to the specified endpoint using multipart form data along with any other fields
 * @param remoteHost the endpoint to upload the file to
 * @param filename the (local) filename of the file to be uploaded
 * @param fields an object containing any other fields to be accompanied in the request
 */
export async function uploadFile(remoteHost, filename, fields) {
  /*************************************
   NOTE: File must be appended last
   so server can use other posted params
   in deciding filename
   ************************************/

  const formData = new FormData();

  // Add additional fields
  Object.keys(fields).map(key => {
    formData.append(key, typeof(fields[key]) !== 'string' ? JSON.stringify(fields[key]) : fields[key])
  });

  // Add the file itself
  const file = localFile(filename);
  formData.append('filename', file);
  formData.append('file', fs.createReadStream(file));


  let response = await fetch(`${remoteHost}`, {
    headers: { 'Authorization': ticket},
    method: 'POST',
    body: formData
  });

  const { ok, status } = response;
  response = await response.json();

  if(!ok) {
    logError(status, response);
  }

  return response.message;
}


/**
 * Creates a websocket to the endpoint specified
 * @param endpoint
 * @param onClose callback for when socket is closed by remote
 * @param onMessage callback for when a message is received from remote
 * @returns {Promise} {WebSocketClient, WebSocketConnection}
 */
export async function openWebSocket(endpoint, {onClose, onMessage}) {
  return new Promise((resolve, reject) => {
    const client = new WebSocketClient();
    client.on('connectFailed', error => {
      console.error(`Couldn't create a web socket connection to ${endpoint}: ${error.toString()}`);
      reject(new Error(`Couldn't create a web socket connection to ${endpoint}: ${error.toString()}`));
    });

    client.on('connect', connection => {
      console.log('WebSocket Client Connected');

      connection.on('error', error => {
        console.error(`Error after connecting to web socket: ${error.toString()}`);
        reject(new Error(`Error after connecting to web socket: ${error}`));
      });

      connection.on('close', onClose);
      connection.on('message', onMessage);

      resolve({client, connection});
    });

    client.connect(endpoint, 'echo-protocol', null, {'Authorization': ticket}, null);
  })
}


/**
 * Encrypts data according to encryption scheme in .env
 * @param data to encrypt
 * @param key for encryption
 * @returns string the encrypted data
 */
export function encrypt(data, key) {
  const { algorithm,  plainEncoding, encryptedEncoding} = encryption;
  const cipher = crypto.createCipher(algorithm, key);
  let ciphered = cipher.update(data, plainEncoding, encryptedEncoding);
  ciphered += cipher.final(encryptedEncoding);
  // console.log(`Encrypted ${data}: ${ciphered}`);

  return ciphered;
}


/**
 * Decrypts the data according to the encryption scheme specified in .env
 * @param data to decrypt
 * @param expectedKey key used during encryption
 * @returns string representation of whatever was encrypted
 */
export function decrypt(data, expectedKey) {
  const { algorithm, plainEncoding, encryptedEncoding} = encryption;

  const decipher = crypto.createDecipher(algorithm, expectedKey);
  let deciphered = decipher.update(data, encryptedEncoding, plainEncoding);
  deciphered += decipher.final(plainEncoding);
  // console.log(`Decrypted ${data}: ${deciphered}`);

  return deciphered
}



/**
 * Builds the full path to the REMOTE_FILES folder and the specified file.
 * @param filename the filename (can be subdirectories) of interest
 * @returns {string} the resolved path
 */
export function localFile(filename) {
  return `${FILES_DIR}${filename}`;
}

/**
 * Debug - Logs Errors and kills process
 * @param status the status message of the request
 * @param response the message sent down
 */
export function logError(status, response) {
  console.error(`Error ${status}`);
  console.log(`${response.message ? response.message : JSON.stringify(response)}`);
  process.exit();
}


