import fs from 'fs'

// Import functions from library
import { localFile } from './lib/util';
import { register, login } from './lib/securityService';
import { getRemoteFiles } from './lib/directoryService';
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


  /***************************************************************************
   * Create Remote Files
   ***************************************************************************/

  await waitForKeyPress("Create stefano.txt");
  // Create remote file
  console.log("Creating Remote stefano.txt");
  await createRemoteFile("stefano.txt", false);
  console.log();


  // Subscribe to remote file
  console.log("Subscribing to remote stefano.txt");
  await subscribeToFile("stefano.txt");
  console.log();



  await waitForKeyPress("Create cat.txt");
  // Create remote file
  console.log("Creating Remote cat.txt");
  await createRemoteFile("cat.txt");
  console.log();


  // Subscribe to remote file
  console.log("Subscribing to remote cat.txt");
  await subscribeToFile("cat.txt");
  console.log();




  await waitForKeyPress("Create dog.txt");
  // Create remote file
  console.log("Creating Remote dog.txt");
  await createRemoteFile("dog.txt", false);
  console.log();


  // Subscribe to remote file
  console.log("Subscribing to remote dog.txt");
  await subscribeToFile("dog.txt");
  console.log();




  await waitForKeyPress("Create turtle.txt");
  // Create remote file
  console.log("Creating Remote turtle.txt");
  await createRemoteFile("turtle.txt", false);
  console.log();


  // Subscribe to remote file
  console.log("Subscribing to remote stefano.txt");
  await subscribeToFile("stefano.txt");
  console.log();



  /***************************************************************************
   * Update remote files
   ***************************************************************************/
  await waitForKeyPress("Update stefano.txt locally");
  // Update stefano.txt locally first
  console.log("Updating stefano.txt locally");
  await localUpdate("stefano.txt");
  console.log();


  await waitForKeyPress("Update on remote");
  // Update that file on remote
  console.log("Updating remote stefano.txt");
  await updateRemoteFile("stefano.txt");
  console.log();


  /***************************************************************************
   * Rename remote files
   ***************************************************************************/

  await waitForKeyPress("Rename cat.txt locally");
  // Rename file locally
  console.log("Renaming cat.txt to renamed.txt locally");
  await localRename("cat.txt", "renamed.txt");
  console.log();

  await waitForKeyPress("Rename cat.txt remote");
  // Rename file on remote
  console.log("Renaming remote cat.txt to renamed.txt");
  await renameRemoteFile("cat.txt", "renamed.txt");
  console.log();

  await waitForKeyPress("Get Remote files");
  // Get My remote files from directory service
  console.log(`Getting Remote files`);
  await getRemoteFiles();
  console.log();


  /***************************************************************************
   * Fetch remote files
   ***************************************************************************/

  await waitForKeyPress("Delete local and fetch remote test");
  console.log(`Deleting and refetching 3 times to check each slave server`);
  for(let i=0;i<3;i++) {
    // Delete file locally
    console.log(`Deleting stefano.txt locally`);
    localDelete("stefano.txt");
    console.log();

    // Retrieve that file from remote
    console.log(`Getting stefano.txt from remote`);
    await getRemoteFile("stefano.txt");
    console.log();


    // Ensure it was retrieved correctly
    console.log(`Reading stefano.txt locally: `);
    const fileStr = fs.readFileSync(localFile("stefano.txt"), {encoding: 'utf-8'});
    console.log(fileStr, "\n");
  }




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
  console.log("Renaming renamed.txt to cat.txt locally");
  await localRename("renamed.txt", "cat.txt");
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
  fs.writeFileSync(localFile(filename), `Updated at ${new Date().toLocaleString()}`);
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
