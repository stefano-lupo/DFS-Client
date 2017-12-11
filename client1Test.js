import fs from 'fs'

// Import functions from library
import { localFile } from './lib/util';
import { register, login } from './lib/securityService';
import { createRemoteFile, updateRemoteFile } from './lib/remoteFileSystem';
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

  // Read the created file
  await waitForKeyPress("Read local copy of stefano.txt");
  console.log(`Reading stefano.txt locally: `);
  let fileStr = fs.readFileSync(localFile("stefano.txt"), {encoding: 'utf-8'});
  console.log(fileStr, "\n");


  // Read the created file
  await waitForKeyPress("Read local copy of stefano.txt again");
  console.log(`Reading stefano.txt locally: `);
  fileStr = fs.readFileSync(localFile("stefano.txt"), {encoding: 'utf-8'});
  console.log(fileStr, "\n");


  /***************************************************************************
   * Update remote files
   ***************************************************************************/

  // Update stefano.txt locally first
  await waitForKeyPress("Update stefano.txt locally");
  console.log("Updating stefano.txt locally");
  await localUpdate("stefano.txt");
  console.log();

  // Update that file on remote
  await waitForKeyPress("Update stefano.txt on remote");
  console.log("Updating remote stefano.txt");
  await updateRemoteFile("stefano.txt");
  console.log();
}


/***********************************************************************************************************************
 * Helper methods for testing
 **********************************************************************************************************************/

function localUpdate(filename) {
  fs.writeFileSync(localFile(filename), `${TEST_NAME}: Updated at ${new Date().toLocaleString()}`);
  console.log(`Locally updated ${filename}`);
}
