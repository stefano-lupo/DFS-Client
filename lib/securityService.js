import fs from 'fs';

import { setAuthTokens, makeRequest, logError, encrypt, decrypt, ENDPOINTS, CLIENT_KEY_LOCATION } from './util';



/**
 * Register for an account with security service
 * POST <SECURITY_SERVICE>/register
 * body: {email, password, name}
 */
export async function register(email, password, name) {
  const { ok, status, response } = await makeRequest(`${ENDPOINTS.SECURITY_SERVICE}/register`, "post", {email, name, password});
  if(!ok) {
    logError(status, response);
  }

  const { clientKey } = response;
  fs.writeFileSync(CLIENT_KEY_LOCATION, clientKey);
  console.log(`Saved Client Key`);

  return clientKey;
}


/**
 * Login to the security service
 * POST <SECURITY_SERVICE>/login?email=<email>
 * body: {encrypted: encrypt(password)}
 * @returns {Promise.<void>}
 */
export async function login(email, password) {
  const clientKey = fs.readFileSync(CLIENT_KEY_LOCATION, {encoding: 'utf-8'});

  const encrypted = encrypt(password, clientKey);

  let { ok, status, response } = await makeRequest(`${ENDPOINTS.SECURITY_SERVICE}/login?email=${email}`, "post", {encrypted});
  if(!ok) {
    logError(status, response);
  }

  const { token } = response;
  const decrypted = decrypt(token, clientKey);
  const { ticket, sessionKey } = JSON.parse(decrypted);

  console.log("Ticket given: ");
  console.log(ticket, "\n");

  console.log("Session key given: ");
  console.log(sessionKey);

  console.log("Setting ticket and session key");
  setAuthTokens(ticket, sessionKey);

}
