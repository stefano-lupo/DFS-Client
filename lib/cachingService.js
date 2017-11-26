import {  makeRequest, localFile, logError, ENDPOINTS } from './util';
import { getRemoteFileInfo } from './directoryService';


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
  console.log(response);
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
  console.log(response);
}