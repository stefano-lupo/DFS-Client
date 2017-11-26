import {  makeRequest, logError, ENDPOINTS } from './util';


/**
 * Acquire a lock for a file
 * GET <LOCKING_SERVER>/lock/<_id>
 */
export async function acquireLock(_id) {

  // Try to acquire a lock
  let { ok, status, response } = await makeRequest(`${ENDPOINTS.LOCK_SERVER}/lock/${_id}`, "get");
  if(!ok || !response.granted) {
    logError(status, response);
  }

  console.log(`Acquired Lock ${response.lock}`);
  return response.lock;
}