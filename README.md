# Distributed File System
This repository contains code for a test client to be used with the Distributed File System. The DFS, client library and test client are all written in Node JS (using ES6 with async/await functionalty from ES8).

The DFS implements 6 out of the 7 optional features: **Distributed Transparent File Access, Directory Service, Lock Service, Security Service, Caching and Replication**.


The system's implementation is contained in 5 other repositories, each of which contains the code and a small write up on their implementation:
1. [DFS-File-System](https://github.com/stefano-lupo/DFS-File-System)
2. [DFS-Directory-Service](https://github.com/stefano-lupo/DFS-Directory-Service)
3. [DFS-Locking-Service](https://github.com/stefano-lupo/DFS-Locking-Service)
4. [DFS-Security-Service](https://github.com/stefano-lupo/DFS-Security-Service)
5. [DFS-Caching-Service](https://github.com/stefano-lupo/DFS-Caching-Service)

**Code for the replication component of the system is scattered throughout each of the 5 repositories.** Replication was less of a distinct service and mainly required refactoring of existing code to accomplish.

# Client Library
The client library creates a new folder for the user's remote files under `<working_directory>/users/<name>/remoteFiles` where `<name>` is the name of the client making use of the library (the name the client registered with).

The client library is split into five broad categories - one for each of the distinct services as defined above.

### securityService.js
This file is responsible for the authentication of client. It exposes the following calls:

##### `register(email, password, name)`
- This makes a call to the security service in order to attempt to register a new acocunt for the client.
- If successful, the security service responds with a symmetric `clientKey` that is used to encrypt subsequent login requests to the security service and this is saved to a file by this function.
##### `login(email, password)`
- Encrypts the given password with the client key and makes the appropriate login request to the security service.
- If successful, the security service will respond with a token used for authentication with all of the other services in the system (as described in the [security service repo's README](https://github.com/stefano-lupo/DFS-Security-Service#security-kerberos)).
- All subsequent requests are made using this token and this is handled by the library.

### remoteFileSystem.js
This file is responsible for all interaction with the remote file system (eg CRUD operations on remote files)

##### `getRemoteFile(filename)`
- Downloads the remote file `<filename>` from the remote file system and stores it in the client's `remoteFiles` directory under the same filename. 

##### `createRemoteFile(filename, isPrivate=true)`
- Uploads a file that is in the client's `remoteFiles` directory with the name `filename` to the remote file server.
- This file can be marked as public by passing a value of `false` for the optional `isPrivate` parameter.
- This also informs the directory service of the new file.

##### `updateRemoteFile(filename)`
- Updates an existing remote file `<filename>` that the client owns with the contents of the current file `<filename>` in the client's `remoteFiles` directory 

##### `renameRemoteFile(oldFileName, newFileName)`
- Renames the remote file `oldFileName` to `<newFileName`

##### `deleteRemoteFile(filename)`
- Deletes the remote file `filename` from the remote file system.


### cachingService.js
Allows the client to only use local files, while keeping those files up to date in the background. 

##### `subscribeToFile(filename)`
- Ensures the file `filename` is always up to date by subscribing to that file with the caching service.
- Whenever this file is changed on remote, the changes will automatically be pulled down and the file updated.

##### `unsubscribeToFile(filename)`
- Removes subscription to remote file with caching service.

### directoryService.js
This handles interfacing with the directrory service and provides the following functions:

##### `getRemoteFiles()`
- This returns all of the remote files we currently have stored on the remote file system.

##### `getPublicFilesForUser(email)`
- This gets all of the files that the user with the email address `email` has which are public.

##### `registerSharedPublicFile(fileNameForUs, ownerId, remoteFileId)`
- This informs the directory service that we would like to access this shared public file.
- Once done, this file looks just like any file we have created on the remote file system, even though it was created by someone else. 
- This is the mechanism for accessing shared files and the directory service simply points us to the remote file on our subsequent requests for this filename.
- **NOTE:** this function does not download or subscribe to the file but rather just makes the remote shared file available to us like any other file.




























