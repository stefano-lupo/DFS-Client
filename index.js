import fetch from 'node-fetch';
import fs from 'fs'
import FormData from 'form-data';


// const FILE_SERVER = "http://localhost:3000";   // shouldn't need to know where this is
const DIRECTORY_SERVICE = "http://localhost:3001";
const LOCK_SERVER = "http://192.168.1.17:3002";
// const LOCK_SERVER = "http://localhost:3002";

const TEST_EMAIL = 'stefano@test.com';
const TEST_NAME = 'Stefano';
const TEST_PASSWORD = '1234';

const FILES_DIR = __dirname + "/remoteFiles/";


/***********************************************************************************************************************
 * Main
 **********************************************************************************************************************/
runClient();

async function runClient() {

  // Register and push file
  // console.log("Registering");
  // await register(TEST_EMAIL, TEST_PASSWORD, TEST_NAME);
  //
  // console.log("Creating Remote stefano.txt");
  // await createRemoteFile("stefano.txt", TEST_EMAIL);

  // Push up cat.txt in postman

  console.log("Downloading remote cat.txt");
  await getRemoteFile("cat.txt");


  // Update that file on remote and pull down changes
  // console.log("Updating remote stefano.txt to local stefano.txt");
  // await updateRemoteFile("stefano.txt", "stefano.txt", TEST_EMAIL);
  //
  // console.log("Downloading remote dog.txt");
  // await getRemoteFile("stefano.txt");



  // console.log("Updating remote stefano.txt to dog.txt");
  // await updateRemoteFile("dog.txt", "stefano.txt", TEST_EMAIL);

}




/***********************************************************************************************************************
 * API Methods
 **********************************************************************************************************************/

/**
 * Register with directory service
 * POST <DIRECTORY_SERVICE>/register
 * body {email, password, name}
 * @param email
 * @param password
 * @param name
 * @returns {Promise.<*>}
 */
async function register(email, password, name) {
  const { ok, status, response } = await makeRequest(`${DIRECTORY_SERVICE}/register`, "post", {email, password, name});
  if(!ok) {
    logError(status, response);
  }

  console.log(`Successfully Logged in ${email}`);
  return ok;
}



/**
 * Create a File on the remote server
 * POST <remoteHost>/file
 * body{file, email}
 */
async function createRemoteFile(filename, email) {

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
  formData.append('email', email);
  formData.append('filename', file);
  formData.append('file', fs.createReadStream(file));

  let response = await fetch(`${remoteHost}/file`, {
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
 * body: {email, file, lock}
 */
// TODO: This doens't refresh our downloaded copy (or redownload the remote one) yet due to directory stuff
async function updateRemoteFile(oldFileName, newFile, email) {

  // Get remote URL from directory server
  const { _id, endpoint } = await getRemoteFileInfo(oldFileName);


  // Try to acquire a lock
  let { ok, status, response } = await makeRequest(`${LOCK_SERVER}/lock/${_id}?email=${email}`, "get");
  if(!ok || !response.granted) {
    logError(status, response);
  }

  const { lock } = response;
  console.log("Acquired Lock");


  //TODO: Refactor uploading a file into a function

  /*************************************
   NOTE: File must be appended last
   so server can use other posted params
   in deciding filename
   ************************************/

  // Now have lock and can push updated file
  const formData = new FormData();
  const file = localFile(newFile);
  formData.append('email', email);
  formData.append('lock', lock);
  formData.append('filename', file);
  formData.append('file', fs.createReadStream(file));


  response = await fetch(`${endpoint}`, {
    method: 'POST',
    body: formData
  });

  ({ ok, status } = response);
  response = await response.json();

  if(!ok) {
    logError(status, response);
  }

  console.log(`Successfully updated ${oldFileName} to ${newFile}`);

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

async function deleteRemoteFile() {

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
//TODO: Add auth token header
async function makeRequest(endpoint, method, body) {
  const headers =  {'Content-Type': 'application/json'};
  let response;
  if(body) {
    response = await fetch(endpoint, {method, body: JSON.stringify(body), headers});
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