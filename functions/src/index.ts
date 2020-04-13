import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

admin.initializeApp(functions.config().firebase);

// Function to select a random word every day at 00:00 Dublin time.
export  * from './functions/wotd';
