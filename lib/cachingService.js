import {  makeRequest, openWebSocket, localFile, logError, ENDPOINTS } from './util';
import { getRemoteFileInfo } from './directoryService';

let client, connection;

// Called when socket closed by server
const onClose = () => {
  console.log(`Socket closing`);
  client = null;
};

// called on receipt of a message from the server
const onMessage = msg => {
  msg = msg.utf8Data;
  try {
    const { message, _id } = JSON.parse(msg);
    console.log(`\n${message}\n`);
  } catch (err) {
    console.error(`Couldn't parse message from cache server: ${msg}`);
  }
};


/**
 * GET <CACHE_SERVICE_WS>/socket
 * Creates a socket connection between the client and the caching server
 * @returns {Promise.<*>}
 */
export async function connectToCachingServer() {

  if(!client) {
    console.log("Creating socket");
    ({ client, connection } = await openWebSocket(`${ENDPOINTS.CACHING_SERVER_WS}/socket`, {onClose, onMessage}));
  }

  return client;
}

/**
 * Closes the socket between the client and server
 */
export function disconnectFromCachingServer() {
  if(client) {
    connection.close();
  }
}


/**
 * Subscribes to filename so that we can be informed of updates to cached file
 * GET <CACHING_SERVER>/subscribe/_id
 */
export async function subscribeToFile(filename) {
  const { _id, endpoint } = await getRemoteFileInfo(filename);

  const { ok, status, response } = await makeRequest(`${ENDPOINTS.CACHING_SERVER}/subscribe/${_id}`, "get");

  if(!ok) {
    logError(status, response);
  }

  console.log(`Response from subscribeToFile: `);
  console.log(response.message);
}


/**
 * Unsubscribes to filename so that we can stop being informed of updates to cached file
 * DELETE <CACHING_SERVER>/subscribe/_id
 */
export async function unsubscribeToFile(filename) {
  const { _id, endpoint } = await getRemoteFileInfo(filename);

  const { ok, status, response } = await makeRequest(`${ENDPOINTS.CACHING_SERVER}/subscribe/${_id}`, "delete");

  if(!ok) {
    logError(status, response);
  }

  console.log(`Response from unsubscribeToFile: `);
  console.log(response.message);
}

