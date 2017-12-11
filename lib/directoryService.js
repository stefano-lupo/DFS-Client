import {  makeRequest, localFile, logError, ENDPOINTS } from './util';

const mappedFiles = new Map();
let remoteMaster;



/***********************************************************************************************************************
 * Exposed Client API
 **********************************************************************************************************************/

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
 * Gets all of the public files for a certain user
 * GET <DIRECTORY_SERVICE>/publicFiles
 */
export async function getPublicFilesForUser(email) {
  const { ok, status, response } = await makeRequest(`${ENDPOINTS.DIRECTORY_SERVICE}/publicFiles/${email}`, 'get');
  if(!ok) {
    logError(status, response);
  }

  console.log(`Public files available: `);
  console.log(JSON.stringify(response));
  return response;
}


/**
 * Register with directory service that we are sharing a remote file with some user
 * POST <DIRECTORY_SERVICE>/sharedFile
 * body: { clientFileName, remoteNodeAddress, remoteFileId }
 * This post body can be formed after fetching all public files and deciding which file we want
 */
export async function registerSharedPublicFile(fileNameForUs, ownerId, remoteFileId) {
  const {ok, status, response } = await makeRequest(`${ENDPOINTS.DIRECTORY_SERVICE}/sharedFile`, 'post',
    {clientFileName: fileNameForUs, ownerId, remoteFileId});

  if(!ok) {
    logError(status, response);
  }

  console.log(`Response from registering with a shared public file: ${response.message}`);
  return response;
}

//TODO: This would be nice to implement - need to store who owns file, who has access to file etc
async function updateFilePrivacy(filename, isPrivate) {

}


/***********************************************************************************************************************
 * Exposed Inter Service API
 **********************************************************************************************************************/


/**
 * Gets the remote endpoint and file _id of the local file
 * @param filename the file of interest
 * returns {string: _id, endpoint}
 */
export async function getRemoteFileInfo(filename) {

  // This is naughty since were trying to load balance our file system nodes using the directory service
  // const info = mappedFiles.get(filename);
  // if(info) {
  //   console.log(`Using cached mapping for ${filename}: ${JSON.stringify(info)}`);
  //   return info;
  // }

  // Fetch the URL of the File Server that contains the file
  const queryParam = `?filename=${encodeURIComponent(localFile(filename))}`;
  let { ok, status, response } = await makeRequest(`${ENDPOINTS.DIRECTORY_SERVICE}/remoteFile/read${queryParam}`, "get");

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
export async function getMasterEndpoint() {

  if(remoteMaster) {
    console.log(`Using cached version of remote master`);
    return remoteMaster;
  }

  const { ok, status, response } = await makeRequest(`${ENDPOINTS.DIRECTORY_SERVICE}/remoteFile/write`, 'get');
  if(!ok) {
    logError(status, response);
  }

  console.log(`Received available remote host ${response.remote}`);
  remoteMaster = response.remote;
  return remoteMaster;
}