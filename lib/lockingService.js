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

  console.log(`Acquired Lock for ${_id}`);
  return response.lock;
}

export async function releaseLock(_id, lock) {
  const { ok, status, response } = await makeRequest(`${ENDPOINTS.LOCK_SERVER}/unlock/${_id}`, 'put', {lock});

  if(!ok) {
    logError(status, response);
  }

  console.log(`Released Lock - ${response.message}`);
}