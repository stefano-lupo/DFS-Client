import fs from 'fs'

// Import functions from library
import { localFile } from './lib/util';
import { register, login } from './lib/securityService';
import { getRemoteFiles, getPublicFilesForUser, registerSharedPublicFile } from './lib/directoryService';
import { createRemoteFile, updateRemoteFile, renameRemoteFile, deleteRemoteFile, getRemoteFile } from './lib/remoteFileSystem';
import { connectToCachingServer, subscribeToFile, unsubscribeToFile, disconnectFromCachingServer } from './lib/cachingService';

const TEST_EMAIL = process.argv[2] || 'stefano@test.com';
const TEST_NAME = process.argv[3] || 'Stefano';
const TEST_PASSWORD = process.argv[4] || '1234';

const stdin = process.stdin;
stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding('utf8');

function waitForKeyPress(message) {
  console.log(`\nPress any key to: ${message}\n`);
  return new Promise(resolve => {
    stdin.on('data', (data) => {
      data === 'q' ? process.exit() : resolve();
    });
  });
}


// Wrap client in async function
runClient();

async function runClient() {

  await waitForKeyPress("Register/Login");

  /***************************************************************************
   * Register / Login first
   ***************************************************************************/
  // Register with security service
  console.log(`Registering ${TEST_EMAIL} with security service`);
  await register(TEST_EMAIL, TEST_PASSWORD, TEST_NAME);
  console.log();

  // Login to security service
  console.log(`Logging ${TEST_EMAIL} into the security service`);
  await login(TEST_EMAIL, TEST_PASSWORD);
  console.log();

  // Connect to the caching server
  console.log(`Connecting to caching server`);
  await connectToCachingServer();
  console.log();


  /**************************************************************************
   * Register with Stefano's shared file
   **************************************************************************/
  await waitForKeyPress("Get all Stefano's public files");
  const { _id, publicFiles } = await getPublicFilesForUser(`stefano@test.com`);

  // Pick some file (just picking most recently uploaded file for example)
  const fileId = publicFiles[publicFiles.length-1].remoteFileId;

  await waitForKeyPress("Register with DS for stefano's shared stefano.txt ");
  await registerSharedPublicFile(localFile('franks_stefano.txt'), _id, fileId);

  await waitForKeyPress("Pull down that remote file");
  console.log(`Getting franks_stefano.txt from remote`);
  await getRemoteFile("franks_stefano.txt");
  console.log();

  console.log("Subscribing to franks remote franks_stefano.txt");
  await subscribeToFile("franks_stefano.txt");
  console.log();


  /**************************************************************************
   * Update the shared file - should also update stefano's stefano.txt
   **************************************************************************/

  // Update franks_stefano.txt locally first
  await waitForKeyPress("Update franks_stefano.txt locally");
  console.log("Updating franks_stefano.txt locally");
  await localUpdate("franks_stefano.txt");
  console.log();

  // Update that file on remote
  await waitForKeyPress("Update franks_stefano.txt on remote");
  console.log("Updating remote franks_stefano.txt");
  await updateRemoteFile("franks_stefano.txt");
  console.log();

  // Disconnect (gracefully) from caching server
  await waitForKeyPress("Disconnect");
  console.log("Disconnecting from caching server");
  disconnectFromCachingServer();
  console.log();

  process.exit();
}


/***********************************************************************************************************************
 * Helper methods for testing
 **********************************************************************************************************************/

function localUpdate(filename) {
  fs.writeFileSync(localFile(filename), `${TEST_NAME}: Updated at ${new Date().toLocaleString()}`);
  console.log(`Locally updated ${filename}`);
}


function localRename(oldFileName, newFileName) {
  fs.renameSync(localFile(oldFileName), localFile(newFileName));
  console.log(`Locally renamed ${oldFileName} to ${newFileName}`);
}

function localDelete(filename) {
  fs.unlinkSync(localFile(filename));
  console.log(`Locally deleted ${filename}`);
}
