import * as admin from 'firebase-admin';

export const database = admin.database();
export const auth = admin.auth();
export type DataSnapshot = admin.database.DataSnapshot;
