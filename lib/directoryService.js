import {  makeRequest, localFile, logError, ENDPOINTS } from './util';

const mappedFiles = new Map();

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

  // Mappings for files will not change over time with my implementation
  // Could log these to a file and recover between sessions but they'll change a bunch during debug so
  const info = mappedFiles.get(filename);
  if(info) {
    console.log(`Using cached mapping for ${filename}`);
    return info;
  }

  // Fetch the URL of the File Server that contains the file
  const queryParam = `?filename=${encodeURIComponent(localFile(filename))}`;
  let { ok, status, response } = await makeRequest(`${ENDPOINTS.DIRECTORY_SERVICE}/remoteFile${queryParam}`, "get");

  if(!ok) {
    logError(status, response);
  }

  mappedFiles.set(filename, response);

  return response;
}

/**
 * GET <DIRECTORY_SERVICE>/remoteFile/:_id
 * Gets file info of remote file by _id
 * @returns {Promise.<void>}
 */
export async function getRemoteFileInfoById(_id) {
  const { ok, status, response } = await makeRequest(`${ENDPOINTS.DIRECTORY_SERVICE}/remoteFile/${_id}`);

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
