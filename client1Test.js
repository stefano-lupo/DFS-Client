import fs from 'fs'

// Import functions from library
import { localFile } from './lib/util';
import { register, login } from './lib/securityService';
import { getRemoteFiles, getPublicFilesForUser } from './lib/directoryService';
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



  /***************************************************************************
   * Register / Login first
   ***************************************************************************/
  // Register with security service
  await waitForKeyPress("Register/Login");
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

  // Create remote file
  await waitForKeyPress("Create stefano.txt");
  console.log("Creating Remote stefano.txt");
  await createRemoteFile("stefano.txt", false);
  console.log();

  // Subscribe to remote file
  console.log("Subscribing to remote stefano.txt");
  await subscribeToFile("stefano.txt");
  console.log();


  /***************************************************************************
   * Update remote files
   ***************************************************************************/

  // Update stefano.txt locally first
  await waitForKeyPress("Update stefano.txt locally");
  console.log("Updating stefano.txt locally");
  await localUpdate("stefano.txt");
  console.log();

  // Update that file on remote
  await waitForKeyPress("Update on remote");
  console.log("Updating remote stefano.txt");
  await updateRemoteFile("stefano.txt");
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
