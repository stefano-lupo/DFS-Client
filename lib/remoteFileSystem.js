import fs from 'fs';

import { uploadFile, localFile, makeRequest, logError } from './util';
import { getRemoteHostToUploadTo, getRemoteFileInfo } from './directoryService';
import { acquireLock } from './lockingService';

/**
 * Create a File on the remote server
 * POST <remoteHost>/file
 * body{file, email}
 */
export async function createRemoteFile(filename, isPrivate=true) {

  const remoteHost = await getRemoteHostToUploadTo();
  const response = await uploadFile(remoteHost, filename, {isPrivate});
  console.log(`Result of createRemoteFile: `);
  console.log(`${response}`);
}

/**
 * Update a remote file with a locally updated file
 * POST <remote>/:_id
 * body: {file, lock}
 */
export async function updateRemoteFile(filename) {

  const { _id, endpoint } = await getRemoteFileInfo(filename);
  const lock = await acquireLock(_id);
  const response = await uploadFile(endpoint, filename, { lock });
  console.log(`Result of updateRemoteFile: `);
  console.log(`${response}`);
}


/**
 * Rename a remote file with a locally renamed file
 * POST <remote>/:_id
 * body: {file, lock}
 */
export async function renameRemoteFile(oldFileName, newFileName) {

  const { _id, endpoint } = await getRemoteFileInfo(oldFileName);
  const lock = await acquireLock(_id);
  const response = await uploadFile(endpoint, newFileName, { lock });
  console.log(`Result of renameRemoteFile: `);
  console.log(`${response}`);
}



/**
 * Get file from remote file server
 * GET <remoteHost>/file/:_id
 */
export async function getRemoteFile(filename) {

  const { endpoint } = await getRemoteFileInfo(filename);

  const file = fs.createWriteStream(localFile(filename), {flags: 'w'});


  // TODO: Check proper Stream procedure (closing etc)
  const { ok, status, response } = await makeRequest(endpoint, "get");
  if(!ok) {
    logError(status, response);
  }

  await new Promise(resolve => {
    response.body.pipe(file)
      .on('finish', resolve)
  });

}


/**
 * Deletes a file off the remote server
 * DELETE <remoteHost>/:id
 */
export async function deleteRemoteFile(filename) {
  const { endpoint } = await getRemoteFileInfo(filename);

  const { ok, status, response } = await makeRequest(endpoint, "delete");
  if(!ok) {
    logError(status, response);
  }

  console.log(`Result of deleteRemoteFile: `);
  console.log(`${response.message}`);
}
