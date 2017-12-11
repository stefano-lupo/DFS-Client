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



# Test Clients
In order to test the entire system, test clients were created. Two different tests were simulated - one for a user simply using the DFS as a means for remote storage and one for two users who are interacting with a shared file.

## Individual Client Test (`individualTest.js`)
This was the first test that was created and simply makes use of all of the functionality offered by the Client Library (except for file sharing). 

The test client does the following:
1. Register / Login.
2. Creates 5 remote files.
3. Updates the contents of the remote files.
4. Renames some of the files (locally and on remote).
5. Deletes a file locally and fetches it from remote to ensure the files are being stored correctly.
    - This is done three times in a row to fetch the file from each of the three remote file system slave nodes that were being used for data replication.
6. Permanently delete files from the remote file system.

This was used as a kind of unit test in order to ensure any changes to components of the system didn't cause any issues. This worked well and behaves exactly as expected.


## Multiple Client Test (`client1Test.js`, `client2Test.js`)
In order to ensure file sharing, caching, updates and locking were all functioning correctly, a test with two separate clients was created.
- Client 1: Stefano (stefano@test.com).
- Client 2: Frank (frank@test.com).

The test goes as follows: 
1. Stefano (Client 1) registers and logs in to the system.
2. Stefano creates a file `stefano.txt` and uploads it to the remote file system under the same name.
3. Stefano subscribes to the remote file.
4. Frank (Client 2) registers and logs in to the system.
5. Frank fetches a list of all of Stefano's available public files and choose a file he likes (Stefano's `stefano.txt` in this case).
6. Frank registers this file as his own with the directory service in order to gain access to it and subcribes to the file.
7. Frank can then download the file from remote and name it whatever he likes (`franks_stefano.txt` in this case).
8. Frank proceeds to update his local file `franks_stefano.txt` and push his changes to the remote file system.
9. As Stefano had subscribed to the remote file `stefano.txt` which points to the **same** actual file on the file system servers that Frank just updated, Stefano's client library is notifed to invalidate his cached copy of the file via a message sent to him through is web socket connection to the caching service.
10. The client library then automatically fetches the updated remote file in the background ensuring Stefano's file is up to date.
11. Stefano then proceeds to update the file at which point Frank's cached copy of the file is invalidated and updated.


This test worked as expected and produced the following logs:
### Stefano (Client1.log)
```shell

> dfs-client@1.0.0 client1 /home/stefano/coding/distributedFileSystem/DFS-Client
> babel-node client1Test.js stefano@test.com Stefano 1234

Press any key to: Register/Login
Registering stefano@test.com with security service
Saved Client Key

Logging stefano@test.com into the security service
Ticket given: 
ec4f6af2265db882e2975cdea8f0d4a586c6306ab81aacac0c73474e4fdc10a9819a168d26964e6bfaab28bcb6b80105da3f4a886f5bccf375e671ecd0426a080d4bd765951bbd7c6c414f7a3afd5141589859cb2bee19994960440596069c2c51fe77a514cf09340a9c77cdc553e8aa429428155d6b7c41feb5ad0b458ba9c74b35e28c00a788bcc0c19d605c4941c1356fed0aa0fb31c74a93be38eef7efd3967fb78200ffa3ca1d56101779870c3fdb6090e73cbdf5f9798bacaaacb5b3ad 
Session key given: 
0ca227b4a7a1cd8962bb88535ce778a3efb6656b02d458369c7e513a22df4a549c7a487c1f5ddd35a7085dbcb96669c9
Setting ticket and session key
Connecting to caching server
Creating socket
WebSocket Client Connected

Press any key to: Create stefano.txt
Creating Remote stefano.txt
Received available remote host http://localhost:3000/file
Result of createRemoteFile: 
Successfully saved /home/stefano/coding/distributedFileSystem/DFS-Client/users/Stefano/remoteFiles/stefano.txt for 5a2ee1f1c61eee5f6b96a964

Subscribing to remote stefano.txt
Response from subscribeToFile: 
5a2ee1f1c61eee5f6b96a964 has been successfully subscribed to 5a2ee1f34f8c4a37a744228e

Press any key to: Read local copy of stefano.txt
Reading stefano.txt locally: 
Stefano: Updated at 12/11/2017, 7:51:01 PM 

# At this point I switched to Frank (Client 2) and updated his copy of the file
Version 1 is now available
Updating 5a2ee1f34f8c4a37a744228e due to changes on remote

# And we can see the changes made by frank
Press any key to: Read local copy of stefano.txt again
Reading stefano.txt locally: 
Frank: Updated at 12/11/2017, 7:52:39 PM 

# Now we can update stefanos copy too
Press any key to: Update stefano.txt locally

Updating stefano.txt locally
Locally updated stefano.txt

# And push that up to remote
Press any key to: Update stefano.txt on remote

Updating remote stefano.txt
Using cached version of remote master
Acquired Lock for 5a2ee1f34f8c4a37a744228e

Version 2 is now available
Updating 5a2ee1f34f8c4a37a744228e due to changes on remote

Result of updateRemoteFile: 
File /home/stefano/coding/distributedFileSystem/DFS-Client/users/Stefano/remoteFiles/stefano.txt updated successfully
Releasing lock
Released Lock - Lock for 5a2ee1f1c61eee5f6b96a964 on 5a2ee1f34f8c4a37a744228e released

```


### Frank (Client2.log)
```Shell

> dfs-client@1.0.0 client2 /home/stefano/coding/distributedFileSystem/DFS-Client
> babel-node client2Test.js frank@test.com Frank frankyy 


Press any key to: Register/Login
Registering frank@test.com with security service
Saved Client Key
Logging frank@test.com into the security service
Ticket given: 
77802faf0290ff573376e7db4de78080e03c864f9cf58980ae6d6e03d199d82f5f0ceaacea304a12683e340bf03f787c4e09845bea030e74e699ca12c0c5ea692f00e17b94fe93af3c847474ed2b48f7d2fc7c27f3d873ff7be235123065c25aa12c5ee080ff4fe30be2063b811445c48147543598916170c6a16815e5486c5333b1d0b96f5e9f9df240511d6d585f57b11d5f2a11cc1b26577916b17f90968a4a2b116dee24c1a5e352435598f343b2b967bc3df952314decaacf12f5bcdad4 
Session key given: 
add9ecec67b9af5297e0d947fac451a722a994b22a4efee0cc386d443eb3fb10bf72112dcedb3e55afb9cc20db1c1e34
Setting ticket and session key
Connecting to caching server
Creating socket
WebSocket Client Connected



Press any key to: Get all Stefano's public files
Public files available: 
{"_id":"5a2ee1f1c61eee5f6b96a964","publicFiles":[{"remoteFileId":"5a2ee1f34f8c4a37a744228e","clientFileName":"/home/stefano/coding/distributedFileSystem/DFS-Client/users/Stefano/remoteFiles/stefano.txt"}]}


Press any key to: Register with directory service for stefano's shared stefano.txt 
Response from registering with a shared public file: Added a directory entry for 5a2ee1f7c61eee5f6b96a965 for file /home/stefano/coding/distributedFileSystem/DFS-Client/users/Frank/remoteFiles/franks_stefano.txt


Press any key to: Pull down that file from remote.
Getting franks_stefano.txt from remote

Subscribing to franks remote franks_stefano.txt
Response from subscribeToFile: 
5a2ee1f7c61eee5f6b96a965 has been successfully subscribed to 5a2ee1f34f8c4a37a744228e


Press any key to: Read local copy of franks_stefano.txt
Reading franks_stefano.txt locally: 
Stefano: Updated at 12/11/2017, 7:51:01 PM 


Press any key to: Update franks_stefano.txt locally
Updating franks_stefano.txt locally
Locally updated franks_stefano.txt


Press any key to: Read updated local copy of franks_stefano.txt
Reading franks_stefano.txt locally: 
Frank: Updated at 12/11/2017, 7:52:39 PM 


Press any key to: Update franks_stefano.txt on remote
Updating remote franks_stefano.txt
Received available remote host http://localhost:3000/file
Acquired Lock for 5a2ee1f34f8c4a37a744228e

Version 1 is now available
Updating 5a2ee1f34f8c4a37a744228e due to changes on remote

Result of updateRemoteFile: 
File /home/stefano/coding/distributedFileSystem/DFS-Client/users/Frank/remoteFiles/franks_stefano.txt updated successfully
Releasing lock
Released Lock - Lock for 5a2ee1f7c61eee5f6b96a965 on 5a2ee1f34f8c4a37a744228e released


# At this point, stefano updated the file
Version 2 is now available
Updating 5a2ee1f34f8c4a37a744228e due to changes on remote

Press any key to: Read local copy of franks_stefano.txt
Reading franks_stefano.txt locally: 
Stefano: Updated at 12/11/2017, 7:52:53 PM 
```

This shows that the file sharing aspect of the DFS was working correclty.





















