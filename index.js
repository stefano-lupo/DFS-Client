import fetch from 'node-fetch';
import fs from 'fs'


// const FILE_SERVER = "http://localhost:3000";   // shouldn't need to know where this is
const DIRECTORY_SERVICE = "http://localhost:3001";
const LOCK_SERVER = "http://localhost:3002";


/**
 * Main
 */
runClient();






async function runClient() {
  await register("lupos@tcd.ie", "1234", "Stefano");
  const remoteHost = await getRemoteHost();
  await createRemoteFile(remoteHost, "files/stefano.txt");

}

/**
 * Register with directory service
 * POST {email, password, name}
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
 * Get Remote Node to upload to
 */
async function getRemoteHost() {
  const { ok, status, response } = await makeRequest(`${DIRECTORY_SERVICE}/remoteHost`, 'get');
  if(!ok) {
    logError(status, response);
  }

  console.log(`Received available remote host ${response}`);
  return response;
}


/**
 * POST <remoteHost>/file body{file, email}
 * Create a File on the remote server
 */
async function createRemoteFile(remoteHost, filename) {
  const stats = fs.statSync(filename);
  const fileSizeInBytes = stats.size;
  const readStream = fs.createReadStream(filename);

  let response = await fetch(`${remoteHost}/file`, {
    method: 'POST',
    headers: {
      "Content-length": fileSizeInBytes
    },
    body: readStream
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
 * Makes a request to the specified endpoint
 * @param endpoint URL to hit
 * @param method HTTP Verb
 * @param body (optional if POST/PUT)
 * @param stringify (optional if POST/PUT) JSON.stringify(body) or not
 * @returns {Promise.<{ok: *, status: *, response: *}>}
 */
async function makeRequest(endpoint, method, body=null, stringify = true) {
  const headers =  {'Content-Type': 'application/json'};
  let response;
  if(body) {
    const body = stringify ? JSON.stringify(body) : body;
    response = await fetch(endpoint, {method, body, headers});
  } else {
    response = await fetch(endpoint, {method, headers})
  }

  const { ok, status } = response;

  const contentType = response.headers.get("content-type");
  if(contentType && contentType.indexOf("application/json") !== -1) {
    response = await response.json();
  } else {
    response = await response.text();
  }

  return {ok, status, response}

}

function logError(status, response) {
  console.error(`Error ${status}`);
  console.log(`${JSON.stringify(response)}`);
  process.exit();
}