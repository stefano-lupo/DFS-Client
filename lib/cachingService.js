import {  makeRequest, openWebSocket, logError, ENDPOINTS } from './util';
import { getRemoteFileInfo } from './directoryService';
import { getRemoteFileById } from './remoteFileSystem';

let client, connection;



/***********************************************************************************************************************
 * Exposed Client API
 **********************************************************************************************************************/


/**
 * Subscribes to filename so that we can be informed of updates to cached file
 * GET <CACHING_SERVER>/subscribe/_id
 */
export async function subscribeToFile(filename) {
  const { _id } = await getRemoteFileInfo(filename);

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
  const { _id } = await getRemoteFileInfo(filename);

  const { ok, status, response } = await makeRequest(`${ENDPOINTS.CACHING_SERVER}/subscribe/${_id}`, "delete");

  if(!ok) {
    logError(status, response);
  }

  console.log(`Response from unsubscribeToFile: `);
  console.log(response.message);
}




/***********************************************************************************************************************
 * Inter service methods
 **********************************************************************************************************************/

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




/***********************************************************************************************************************
 * Helper Methods
 **********************************************************************************************************************/

// Called when socket closed by server
const onClose = () => {
  console.error(`Socket closing`);
  client = null;
};

// called on receipt of a message from the server
const onMessage = async msg => {
  msg = msg.utf8Data;
  try {
    const { message, _id } = JSON.parse(msg);
    console.log(`\n${message}\n`);

    console.log(`Updating ${_id} due to changes on remote\n`);
    await getRemoteFileById(_id);

  } catch (err) {
    console.error(`Couldn't parse message from cache server: ${msg}`);
  }
};


/**
 * Closes the socket between the client and server
 */
function disconnectFromCachingServer() {
  if(client) {
    connection.close();
  }
}


process.on('exit', disconnectFromCachingServer);

//catches ctrl+c event
process.on('SIGINT',  disconnectFromCachingServer);

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', disconnectFromCachingServer);
process.on('SIGUSR2', disconnectFromCachingServer);

//catches uncaught exceptions
process.on('uncaughtException', disconnectFromCachingServer);
