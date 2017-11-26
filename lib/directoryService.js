import {  makeRequest, localFile, logError, ENDPOINTS } from './util';


/**
 * Gets all of the remote files we have stored across all nodes
 * GET <DIRECTORY_SERVICE>/remoteFiles
 */
export async function getRemoteFiles() {
  const { ok, status, response } = await makeRequest(`${ENDPOINTS.DIRECTORY_SERVICE}/remoteFiles`, "get");
  if(!ok) {
    logError(status, response);
  }

  console.log(response);
}


/**
 * Gets the remote endpoint and file _id of the local file
 * @param filename the file of interest
 * returns {string: _id, endpoint}
 */
export async function getRemoteFileInfo(filename) {
  // Fetch the URL of the File Server that contains the file
  const queryParam = `?filename=${encodeURIComponent(localFile(filename))}`;
  let { ok, status, response } = await makeRequest(`${ENDPOINTS.DIRECTORY_SERVICE}/remoteFile${queryParam}`, "get");

  if(!ok) {
    logError(status, response);
  }

  return response;
}


/**
 * Get Remote Node of File Server to upload to
 * GET <DIRECTORY_SERVICE>/remoteHost
 */
export async function getRemoteHostToUploadTo() {
  const { ok, status, response } = await makeRequest(`${ENDPOINTS.DIRECTORY_SERVICE}/remoteHost`, 'get');
  if(!ok) {
    logError(status, response);
  }

  console.log(`Received available remote host ${response.remote}`);
  return response.remote;
}



//TODO: This would be nice to implement - need to store who owns file, who has access to file etc
async function updateFilePrivacy(filename, isPrivate) {

}