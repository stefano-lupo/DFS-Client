import fs from 'fs'

// Import functions from library
import { localFile } from './lib/util';
import { register, login } from './lib/securityService';
import { getRemoteFiles } from './lib/directoryService';
import { createRemoteFile, updateRemoteFile, renameRemoteFile, deleteRemoteFile, getRemoteFile } from './lib/remoteFileSystem';

const TEST_EMAIL = 'stefano@test.com';
const TEST_NAME = 'Stefano';
const TEST_PASSWORD = '1234';

// Wrap client in async function
runClient();

async function runClient() {

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



  /***************************************************************************
   * Create Remote Files
   ***************************************************************************/

  // Create remote file
  console.log("Creating Remote stefano.txt");
  await createRemoteFile("stefano.txt", false);
  console.log();


  // Create remote file
  console.log("Creating Remote cat.txt");
  await createRemoteFile("cat.txt");
  console.log();


  // Get My remote files from directory service
  console.log(`Getting Remote files`);
  await getRemoteFiles();
  console.log();



  /***************************************************************************
   * Update remote files
   ***************************************************************************/

  // Update stefano.txt locally first
  console.log("Updating stefano.txt locally");
  await localUpdate("stefano.txt");
  console.log();

  // Update that file on remote
  console.log("Updating remote stefano.txt");
  await updateRemoteFile("stefano.txt");
  console.log();


  /***************************************************************************
   * Rename remote files
   ***************************************************************************/


  // Rename file locally
  console.log("Renaming cat.txt to renamed.txt locally");
  await localRename("cat.txt", "renamed.txt");
  console.log();


  // Rename file on remote
  console.log("Renaming remote cat.txt to renamed.txt");
  await renameRemoteFile("cat.txt", "renamed.txt");
  console.log();


  // Get My remote files from directory service
  console.log(`Getting Remote files`);
  await getRemoteFiles();
  console.log();


  /***************************************************************************
   * Fetch remote files
   ***************************************************************************/

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



  /***************************************************************************
   * Delete remote files
   ***************************************************************************/

  // Delete file on remote
  console.log("Deleting remote renamed.txt");
  await deleteRemoteFile("renamed.txt");
  console.log();



  /***************************************************************************
   * Reset files for subsequent tests remote files
   ***************************************************************************/
  // Rename file locally
  console.log("Renaming renamed.txt to cat.txt locally");
  await localRename("renamed.txt", "cat.txt");
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
