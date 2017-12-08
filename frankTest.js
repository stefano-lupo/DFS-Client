import fs from 'fs'

// Import functions from library
import { localFile } from './lib/util';
import { register, login } from './lib/securityService';
import { getRemoteFiles, getAllPublicFiles, registerSharedPublicFile } from './lib/directoryService';
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
  // await waitForKeyPress("Get all public files");
  // await getAllPublicFiles();
  //
  // await waitForKeyPress("Register with DS for stefano's shared stefano.txt ");
  // await registerSharedPublicFile(localFile('franks_stefano.txt'), 'http://localhost:3000', '5a2abdc2e98c6d11ade033ec');
  //
  // await waitForKeyPress("Pull down that remote file");
  // console.log(`Getting franks_stefano.txt from remote`);
  // await getRemoteFile("franks_stefano.txt");

  console.log("Subscribing to franks remote franks_stefano.txt");
  await subscribeToFile("franks_stefano.txt");
  console.log();

  await waitForKeyPress("Update franks_stefano.txt locally");
  // Update stefano.txt locally first
  console.log("Updating franks_stefano.txt locally");
  await localUpdate("franks_stefano.txt");
  console.log();

  await waitForKeyPress("Update franks_stefano.txt on remote");
  // Update that file on remote
  console.log("Updating remote franks_stefano.txt");
  await updateRemoteFile("franks_stefano.txt");
  console.log();

  return;

  /***************************************************************************
   * Create Remote Files
   ***************************************************************************/

  await waitForKeyPress("Create frank.txt");
  // Create remote file
  console.log("Creating Remote frank.txt");
  await createRemoteFile("frank.txt", false);
  console.log();


  // Subscribe to remote file
  console.log("Subscribing to remote frank.txt");
  await subscribeToFile("frank.txt");
  console.log();


  await waitForKeyPress("Create dog.txt");
  // Create remote file
  console.log("Creating Remote dog.txt");
  await createRemoteFile("dog.txt");
  console.log();


  // Subscribe to remote file
  console.log("Subscribing to remote dog.txt");
  await subscribeToFile("cat.txt");
  console.log();

  await waitForKeyPress("Get Remote files");
  // Get My remote files from directory service
  console.log(`Getting Remote files`);
  await getRemoteFiles();
  console.log();


  /***************************************************************************
   * Update remote files
   ***************************************************************************/
  await waitForKeyPress("Update frank.txt locally");
  // Update stefano.txt locally first
  console.log("Updating frank.txt locally");
  await localUpdate("frank.txt");
  console.log();


  await waitForKeyPress("Update frank.txt on remote");
  // Update that file on remote
  console.log("Updating remote frank.txt");
  await updateRemoteFile("frank.txt");
  console.log();


  /***************************************************************************
   * Rename remote files
   ***************************************************************************/

  await waitForKeyPress("Rename dog.txt locally");
  // Rename file locally
  console.log("Renaming dog.txt to renamed.txt locally");
  await localRename("dog.txt", "renamed.txt");
  console.log();

  await waitForKeyPress("Rename dog.txt remote");
  // Rename file on remote
  console.log("Renaming remote dog.txt to renamed.txt");
  await renameRemoteFile("dog.txt", "renamed.txt");
  console.log();

  await waitForKeyPress("Get Remote files");
  // Get My remote files from directory service
  console.log(`Getting Remote files`);
  await getRemoteFiles();
  console.log();


  /***************************************************************************
   * Fetch remote files
   ***************************************************************************/

  // Delete file locally
  console.log(`Deleting frank.txt locally`);
  localDelete("frank.txt");
  console.log();

  // Retrieve that file from remote
  console.log(`Getting frank.txt from remote`);
  await getRemoteFile("frank.txt");
  console.log();


  // Ensure it was retrieved correctly
  console.log(`Reading frank.txt locally: `);
  const fileStr = fs.readFileSync(localFile("frank.txt"), {encoding: 'utf-8'});
  console.log(fileStr, "\n");



  /***************************************************************************
   * Delete remote files
   ***************************************************************************/

  // Delete file on remote
  console.log("Deleting remote renamed.txt");
  await deleteRemoteFile("renamed.txt");
  console.log();



  /***************************************************************************
   * Clean up and reset files for subsequent tests remote files
   ***************************************************************************/
  // Rename file locally
  console.log("Renaming renamed.txt to dog.txt locally");
  await localRename("renamed.txt", "dog.txt");
  console.log();


  // Disconnect (gracefully) from caching server
  console.log("Disconnecting from caching server");
  disconnectFromCachingServer();
  console.log();


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
