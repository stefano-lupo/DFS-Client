import fs from 'fs'

// Import functions from library
import { localFile } from './lib/util';
import { register, login } from './lib/securityService';
import { getPublicFilesForUser, registerSharedPublicFile } from './lib/directoryService';
import { updateRemoteFile, getRemoteFile } from './lib/remoteFileSystem';
import { subscribeToFile } from './lib/cachingService';

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


  /**************************************************************************
   * Register with Stefano's shared file
   **************************************************************************/

  // Get all Stefanos public files
  await waitForKeyPress("Get all Stefano's public files");
  const { _id, publicFiles } = await getPublicFilesForUser(`stefano@test.com`);
  console.log();

  // Pick some file (just picking most recently uploaded file for example)
  const fileId = publicFiles[publicFiles.length-1].remoteFileId;

  // Register that public file as shared file with directory service
  await waitForKeyPress("Register with directory service for stefano's shared stefano.txt ");
  await registerSharedPublicFile(localFile('franks_stefano.txt'), _id, fileId);
  console.log();


  // Download that file from remote
  await waitForKeyPress("Pull down that file from remote.");
  console.log(`Getting franks_stefano.txt from remote`);
  await getRemoteFile("franks_stefano.txt");
  console.log();

  // Subscribe to that file
  console.log("Subscribing to franks remote franks_stefano.txt");
  await subscribeToFile("franks_stefano.txt");
  console.log();

  // Read the downloaded file
  await waitForKeyPress("Read local copy of franks_stefano.txt");
  console.log(`Reading franks_stefano.txt locally: `);
  let fileStr = fs.readFileSync(localFile("franks_stefano.txt"), {encoding: 'utf-8'});
  console.log(fileStr, "\n");




  /**************************************************************************
   * Update the shared file - should also update stefano's stefano.txt
   **************************************************************************/

  // Update franks_stefano.txt locally first
  await waitForKeyPress("Update franks_stefano.txt locally");
  console.log("Updating franks_stefano.txt locally");
  await localUpdate("franks_stefano.txt");
  console.log();

  // Read the updated file
  await waitForKeyPress("Read updated local copy of franks_stefano.txt");
  console.log(`Reading franks_stefano.txt locally: `);
  fileStr = fs.readFileSync(localFile("franks_stefano.txt"), {encoding: 'utf-8'});
  console.log(fileStr, "\n");

  // Update that file on remote
  await waitForKeyPress("Update franks_stefano.txt on remote");
  console.log("Updating remote franks_stefano.txt");
  await updateRemoteFile("franks_stefano.txt");
  console.log();


  // Read stefanos updates to file
  await waitForKeyPress("Read local copy of franks_stefano.txt");
  console.log(`Reading franks_stefano.txt locally: `);
  fileStr = fs.readFileSync(localFile("franks_stefano.txt"), {encoding: 'utf-8'});
  console.log(fileStr, "\n");
}


/***********************************************************************************************************************
 * Helper methods for testing
 **********************************************************************************************************************/

function localUpdate(filename) {
  fs.writeFileSync(localFile(filename), `${TEST_NAME}: Updated at ${new Date().toLocaleString()}`);
  console.log(`Locally updated ${filename}`);
}