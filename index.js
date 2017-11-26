import fetch from 'node-fetch';
import fs from 'fs'
import FormData from 'form-data';
import crypto from 'crypto';


const SECURITY_SERVICE = "http://localhost:3003";
const DIRECTORY_SERVICE = "http://localhost:3001";
const LOCK_SERVER = "http://localhost:3002";

const TEST_EMAIL = 'stefano@test.com';
const TEST_NAME = 'Stefano';
const TEST_PASSWORD = '1234';

const FILES_DIR = `${__dirname}/remoteFiles/`;
const CLIENT_KEY = `${__dirname}/clientKey.txt`;


// Initialize .env
require('dotenv').config();
const encryption = {
  algorithm: process.env.SYMMETRIC_ENCRYPTION,
  plainEncoding: process.env.PLAIN_ENCODING,
  encryptedEncoding: process.env.ENCRYPTED_ENCODING
};

let ticket, sessionKey;


/***********************************************************************************************************************
 * Main
 **********************************************************************************************************************/
runClient();

async function runClient() {

  /***************************************************************************
   * Register / Login first
   ****************************************************************************/
  // Register with security service
  console.log(`Registering ${TEST_EMAIL} with security service`);
  await register(TEST_EMAIL, TEST_PASSWORD, TEST_NAME);
  console.log();


  // Login to security service
  console.log(`Logging ${TEST_EMAIL} into the security service`);
  ({ ticket, sessionKey } = await login(TEST_EMAIL, TEST_PASSWORD));
  console.log();


  // Create remote file
  console.log("Creating Remote stefano.txt");
  await createRemoteFile("stefano.txt", false);
  console.log();


  // Create remote file
  console.log("Creating Remote cat.txt");
  await createRemoteFile("cat.txt");
  console.log();


  // Get My remote files from directory service
  console.log(`Getting Remote files`);
  await getRemoteFiles();
  console.log();


  // Rename file on remote
  console.log("Renaming remote stefano.txt to renamed.txt");
  await testRename("stefano.txt", "rename.txt");
  console.log();


  // Update that file on remote
  console.log("Updating remote rename.txt");
  await testUpdate("rename.txt");
  console.log();


  // Rename back to stefano.txt
  console.log("Renaming remote renamed.txt back to stefano.txt");
  await testRename("rename.txt", "stefano.txt");
  console.log();


  // Update that file on remote
  console.log("Updating remote stefano.txt");
  await testUpdate("stefano.txt");
  console.log();


  // Delete that file locally
  console.log(`Deleting stefano.txt locally`);
  fs.unlinkSync(localFile("stefano.txt"));
  console.log();

  // Retrieve that file from remote
  console.log(`Getting stefano.txt from remote`);
  await getRemoteFile("stefano.txt");
  console.log();


  // Ensure it was retrieved correctly
  console.log(`Reading stefano.txt locally: `);
  const fileStr = fs.readFileSync(localFile("stefano.txt"), {encoding: 'utf-8'});
  console.log(fileStr, "\n");


  // Delete file on remote
  console.log("Deleting remote cat.txt");
  await deleteRemoteFile("cat.txt");
  console.log();


  // Get My remote files from directory service
  console.log(`Getting Remote files`);
  await getRemoteFiles();
  console.log();

}


/***********************************************************************************************************************
 * Test methods
 **********************************************************************************************************************/

async function testUpdate(filename) {
  const { _id, endpoint } = await getRemoteFileInfo(filename);

  const lock = await acquireLock(_id);

  fs.writeFileSync(localFile(filename), `Updated at ${new Date().toLocaleString()}`);

  console.log(`Locally updated ${filename}`);
  await updateRemoteFile(endpoint, filename, lock);

}


async function testRename(oldFileName, newFileName) {
  const { _id, endpoint } = await getRemoteFileInfo(oldFileName);

  const lock = await acquireLock(_id);

  fs.renameSync(localFile(oldFileName), localFile(newFileName));
  console.log(`Locally renamed ${oldFileName} to ${newFileName}`);

  await updateRemoteFile(endpoint, newFileName, lock);
}


/***********************************************************************************************************************
 * API Methods
 **********************************************************************************************************************/

/**
 * Register for an account with security service
 * POST <SECURITY_SERVICE>/register
 * body: {email, password, name}
 */
async function register(email, password, name) {
  const { ok, status, response } = await makeRequest(`${SECURITY_SERVICE}/register`, "post", {email, name, password});
  if(!ok) {
    logError(status, response);
  }

  const { clientKey } = response;
  fs.writeFileSync(CLIENT_KEY, clientKey);
  console.log(`Saved Client Key`);

  return clientKey;
}


/**
 * Login to the security service
 * POST <SECURITY_SERVICE>/login?email=<email>
 * body: {encrypted: encrypt(password)}
 * @returns {Promise.<void>}
 */
async function login(email, password) {
  const clientKey = fs.readFileSync(CLIENT_KEY, {encoding: 'utf-8'});
  const encrypted = encrypt(password, encryption, clientKey);

  let { ok, status, response } = await makeRequest(`${SECURITY_SERVICE}/login?email=${email}`, "post", {encrypted})
  if(!ok) {
    logError(status, response);
  }

  const { token } = response;
  const decrypted = decrypt(token, encryption, clientKey);
  const { ticket, sessionKey } = JSON.parse(decrypted);

  console.log("Ticket given: ");
  console.log(ticket, "\n");

  console.log("Session key given: ");
  console.log(sessionKey);

  // Debug, just verifying ticket is correct
  // console.log(`DEBUG: Verifying given ticket is valid\n`);
  // ({ ok, response, status } = await makeRequest(`${SECURITY_SERVICE}/verifyTicket`, "post", {ticket}));
  //
  // if(!ok) {
  //   logError(status, response);
  // }
  //
  // console.log(response);

  return {ticket, sessionKey};
}


/**
 * Gets all of the remote files we have stored across all nodes
 * GET <DIRECTORY_SERVICE>/remoteFiles
 */
async function getRemoteFiles() {
  const { ok, status, response } = await makeRequest(`${DIRECTORY_SERVICE}/remoteFiles`, "get");
  if(!ok) {
    logError(status, response);
  }

  console.log(response);
}




/**
 * Create a File on the remote server
 * POST <remoteHost>/file
 * body{file, email}
 */
async function createRemoteFile(filename, isPrivate=true) {

  // Get remote host ot upload to from directory service
  const remoteHost = await getRemoteHostToUploadTo();

  //TODO: Refactor uploading a file into a function
  // Upload file to that remote host
  const formData = new FormData();

  /*************************************
   NOTE: File must be appended last
   so server can use other posted params
   in deciding filename
   ************************************/
  const file = localFile(filename);
  formData.append('filename', file);
  formData.append('isPrivate', JSON.stringify(isPrivate));
  formData.append('file', fs.createReadStream(file));

  let response = await fetch(`${remoteHost}/file`, {
    headers: { 'Authorization': ticket},
    method: 'POST',
    body: formData
  });

  const { ok, status } = response;
  response = await response.json();

  if(!ok) {
    logError(status, response);
  }

  console.log(`Successfully saved file ${filename} on ${remoteHost}`);
}

/**
 * Update remote file on file server
 * POST <remote>/:_id
 * body: {file, lock}
 */
async function updateRemoteFile(endpoint, newFile, lock) {

  //TODO: Refactor uploading a file into a function

  /*************************************
   NOTE: File must be appended last
   so server can use other posted params
   in deciding filename
   ************************************/

  // Now have lock and can push updated file
  const formData = new FormData();
  const file = localFile(newFile);
  formData.append('lock', lock);
  formData.append('filename', file);
  formData.append('file', fs.createReadStream(file));


  let response = await fetch(`${endpoint}`, {
    headers: { 'Authorization': ticket},
    method: 'POST',
    body: formData
  });

  const { ok, status } = response;
  response = await response.json();

  if(!ok) {
    logError(status, response);
  }

  console.log(`Successfully updated ${newFile}`);

}


//TODO: This would be nice to implement - need to store who owns file, who has access to file etc
async function updateFilePrivacy(filename, isPrivate) {

}


/**
 * Get file from remote file server
 * GET <DIRECTORY_SERVICE>/filename
 */
async function getRemoteFile(filename) {

  const { _id, endpoint } = await getRemoteFileInfo(filename);

  const file = fs.createWriteStream(localFile(filename), {flags: 'w'});


  // TODO: Check proper Stream procedure (closing etc)
  const { ok, status, response } = await makeRequest(endpoint, "get");
  if(!ok) {
    logError(status, response);
  }

  await new Promise(resolve => {
    response.body.pipe(file)
      .on('finish', resolve)
  });

}


/**
 * Deletes a file off the remote server
 * DELETE <remoteHost>/:id
 */
async function deleteRemoteFile(filename) {
  const { _id, endpoint } = await getRemoteFileInfo(filename);

  const { ok, status, response } = await makeRequest(endpoint, "delete");
  if(!ok) {
    logError(status, response);
  }

  console.log(response);
}


/**
 * Acquire a lock for a file
 * GET <LOCKING_SERVER>/lock/<_id>
 */
async function acquireLock(_id) {

  // Try to acquire a lock
  let { ok, status, response } = await makeRequest(`${LOCK_SERVER}/lock/${_id}`, "get");
  if(!ok || !response.granted) {
    logError(status, response);
  }

  console.log(`Acquired Lock ${response.lock}`);
  return response.lock;
}









/***********************************************************************************************************************
 * Helper Methods
 **********************************************************************************************************************/


/**
 * Get Remote Node of File Server to upload to
 * GET <DIRECTORY_SERVICE>/remoteHost
 */
async function getRemoteHostToUploadTo() {
  const { ok, status, response } = await makeRequest(`${DIRECTORY_SERVICE}/remoteHost`, 'get');
  if(!ok) {
    logError(status, response);
  }

  console.log(`Received available remote host ${response.remote}`);
  return response.remote;
}

/**
 * Gets the remote endpoint and file _id of the local file
 * @param filename the file of interest
 * @returns {_id, endpoint}
 */
async function getRemoteFileInfo(filename) {
  // Fetch the URL of the File Server that contains the file
  const queryParam = `?filename=${encodeURIComponent(localFile(filename))}`;
  let { ok, status, response } = await makeRequest(`${DIRECTORY_SERVICE}/remoteFile${queryParam}`, "get");

  if(!ok) {
    logError(status, response);
  }

  return response;
}


/**
 * Makes a request to the specified endpoint
 * @param endpoint URL to hit
 * @param method HTTP Verb
 * @param body (optional if POST/PUT)
 * @returns {Promise.<{ok: *, status: *, response: *}>}
 */
async function makeRequest(endpoint, method, body) {
  const headers =  {'Content-Type': 'application/json', 'Authorization': ticket};
  let response;
  if(body) {
    if(sessionKey) {
      console.log("MAKING REQUEST: ENCRYPTING");
      const encrypted = encrypt(JSON.stringify(body), encryption, sessionKey);
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
 * Builds the full path to the REMOTE_FILES folder and the specified file.
 * @param filename the filename (can be subdirectories) of interest
 * @returns {string} the resolved path
 */
function localFile(filename) {
  return `${FILES_DIR}${filename}`;
}


function encrypt(data, encryption, key) {
  const { algorithm,  plainEncoding, encryptedEncoding} = encryption;
  const cipher = crypto.createCipher(algorithm, key);
  let ciphered = cipher.update(data, plainEncoding, encryptedEncoding);
  ciphered += cipher.final(encryptedEncoding);
  // console.log(`Encrypted ${data}: ${ciphered}`);

  return ciphered;
}

function decrypt(data, encryption, expectedKey) {
  const { algorithm, generationKey, plainEncoding, encryptedEncoding} = encryption;

  const decipher = crypto.createDecipher(algorithm, expectedKey);
  let deciphered = decipher.update(data, encryptedEncoding, plainEncoding);
  deciphered += decipher.final(plainEncoding);
  // console.log(`Decrypted ${data}: ${deciphered}`);

  return deciphered
}


/**
 * Debug - Logs Errors and kills process
 * @param status the status message of the request
 * @param response the message sent down
 */
function logError(status, response) {
  console.error(`Error ${status}`);
  console.log(`${response.message ? response.message : JSON.stringify(response)}`);
  process.exit();
}

