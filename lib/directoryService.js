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

/**
 * Gets all of the currently public files from all users
 * GET <DIRECTORY_SERVICE>/publicFiles
 */
export async function getAllPublicFiles() {
  const { ok, status, response } = await makeRequest(`${ENDPOINTS.DIRECTORY_SERVICE}/publicFiles`, 'get');
  if(!ok) {
    logError(status, response);
  }

  console.log(`Public files available: `);
  console.log(response);
  return response;
}


/**
 * Register with directory service that we are sharing a remote file with some user
 * POST <DIRECTORY_SERVICE>/sharedFile
 * body: { clientFileName, remoteNodeAddress, remoteFileId }
 * This post body can be formed after fetching all public files and deciding which file we want
 */
export async function registerSharedPublicFile(fileNameForUs, remoteNodeAddress, remoteFileId) {
  const {ok, status, response } = await makeRequest(`${ENDPOINTS.DIRECTORY_SERVICE}/sharedFile`, 'post',
    {clientFileName: fileNameForUs, remoteNodeAddress, remoteFileId});

  if(!ok) {
    logError(status, response);
  }

  console.log(`Response from registering with a shared public file: ${response.message}`);
  return response;
}

//TODO: This would be nice to implement - need to store who owns file, who has access to file etc
async function updateFilePrivacy(filename, isPrivate) {

}
