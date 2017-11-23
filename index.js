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


/***********************************************************************************************************************
 * Main
 **********************************************************************************************************************/
runClient();

async function runClient() {
  await register(TEST_EMAIL, TEST_PASSWORD, TEST_NAME);
  await createRemoteFile("files/stefano.txt", TEST_EMAIL);
  await getRemoteFile("stefano.txt")

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
 * @param filename name of file to fetch
 * @param email client's email
 */
async function createRemoteFile(filename, email) {

  // Get remote host from directory service
  const remoteHost = await getRemoteHost();

  // Upload file to that remote host
  const formData = new FormData();
  formData.append('file', fs.createReadStream(filename));
  formData.append('email', email);

  let response = await fetch(`${remoteHost}/file`, {
    method: 'POST',
    body: formData
  });

  const { ok, status } = response;
  response = await response.text();

  if(!ok) {
    logError(status, response);
  }

  console.log(`Successfully saved file ${filename} on ${remoteHost}`);
  return response;
}


/**
 * Get file from remote file server
 * GET <DIRECTORY_SERVICE>/filename
 */
async function getRemoteFile(filename) {

  // Fetch the URL of the File Server that contains the file
  let { ok, status, response } = await makeRequest(`${DIRECTORY_SERVICE}/remoteFile/${filename}`, "get");

  if(!ok) {
    logError(status, response);
  }

  const { remote } = response;

  const file = fs.createWriteStream(`downloaded/${filename}`);

  ({ ok, status, response } = await makeRequest(remote, "get"));
  response.body.pipe(file);
  file.close();

}


/***********************************************************************************************************************
 * Helper Methods
 **********************************************************************************************************************/


/**
 * Get Remote Node of File Server to upload to
 * GET <DIRECTORY_SERVICE>/remoteHost
 */
async function getRemoteHost() {
  const { ok, status, response } = await makeRequest(`${DIRECTORY_SERVICE}/remoteHost`, 'get');
  if(!ok) {
    logError(status, response);
  }

  console.log(`Received available remote host ${response.remote}`);
  return response.remote;
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
 * Debug - Logs Errors and kills process
 * @param status the status message of the request
 * @param response the message sent down
 */
function logError(status, response) {
  console.error(`Error ${status}`);
  console.log(`${JSON.stringify(response)}`);
  process.exit();
}