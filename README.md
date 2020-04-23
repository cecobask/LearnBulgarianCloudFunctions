# LingvinoCloudFunctions
Firebase Cloud Functions is a serverless compute service which lets you deploy code that responds to
events from other sources or Google services. By using Cloud Functions, I eliminated the need to
manage a back-end server and enabled it to be elastically scalable. Whenever I needed a back-end
function, I could just deploy it and trigger it through HTTP request or set up a run schedule.  

This repository hosts two separate cloud functions:

### Word of the day
The function generates a WordOfTheDay object and stores its data in Firebase Database and Google
Cloud Storage. A word gets picked on random basis by the function and is run every 24 hours
automatically. The function communicates with the following services:
- Cloud Scheduler – triggers the execution of Cloud Functions.
- Wordnik API – expects a word and responds with word definition and example sentences.
- Cloud Translation – translates input text and returns the translated result.
- Text-to-Speech (MS Azure Cognitive Services) – expects text and responds with audio (natural
speech).
- Cloud Storage – stores audio files from Text-to-Speech responses and makes them accessible
through HTTP.
- Firebase Database – updates the current word of the day.
    
### User management
This function gets triggered by HTTP requests from the LingvinoAdmin application. It facilitates
administrative operations, including:
- getAllAccounts - returns all user accounts.
- updateAccount - expects a JSON object with user attributes to update (e.g. password, email),
updates the account metadata and returns the results.
- deleteAccount - expects a user ID (uid), deletes the account and returns the results.
- createAccount - expects a JSON user object, creates an account and returns the results.

## External dependencies
- axios
- firebase-admin
- firebase-functions
- google-cloud/storage
- google-cloud/translate
- lodash
- xmlbuilder
