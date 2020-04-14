import * as functions from 'firebase-functions';
import {auth, database} from '../admin';

export const userManagement = functions.https.onCall((data, context) => {
    switch (data.action) {
        case 'getAllAccounts':
            return getAllAccounts();
        case 'updateAccount':
            return updateAccount(data.uid, data.updateField);
        case 'deleteAccount':
            return deleteAccount(data.uid);
        case 'createAccount':
            return createAccount(data.userObject);
    }
});

function createAccount(userObject: any) {
    return auth.createUser(userObject)
        .then(async userRecord => {
            database.ref('users').child(userRecord.uid).set({
                email: userRecord.email,
                userID: userRecord.uid,
                username: userRecord.email!!.split('@')[0]
            }).then().catch();
            return {newUser: userRecord.toJSON(), allUsers: await getAllAccounts()}
        })
        .catch(error => console.log('Error creating new user:', error));
}

function updateAccount(uid: string, updateData: any) {
    return auth.updateUser(uid, updateData)
        .then(async userRecord => ({updatedUser: userRecord.toJSON(), allUsers: await getAllAccounts()}))
        .catch(error => console.log('Error updating user:', error));
}

function deleteAccount(uid: string) {
    database.ref('users').child(uid).remove().then(error => console.log(error)).catch()
    return auth.deleteUser(uid)
        .then(async () => ({success: true, deletedAccountId: uid, allUsers: await getAllAccounts()}))
        .catch(error => console.log('Error deleting user:', error));
}

async function getAllAccounts() {
    return {
        users: await auth.listUsers(1000)
            .then(listUsersResult => listUsersResult.users.map(userRecord => userRecord.toJSON()))
            .catch(error => console.log('Error listing users:', error))
    }
}
