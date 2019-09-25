import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as _ from 'lodash';
import { Translate } from '@google-cloud/translate';
import { Storage } from '@google-cloud/storage';
import axios from 'axios';
import { WordOfTheDay } from './WordOfTheDay';
import fs = require('fs');
import xmlbuilder = require('xmlbuilder');
import path = require('path');
import * as os from 'os';

// Instantiate objects.
const translate = new Translate();
const storage = new Storage();

admin.initializeApp();

// Function to select a random word every day at 00:00 Dublin time.
exports.wordOfTheDay =
    functions.pubsub.schedule('00 00 * * *')
        .timeZone('Europe/Dublin')
        .onRun(async () => {
            const speechToken: string = await getSpeechAccessToken(functions.config().speechservice.subkey)
                .then(response => {
                    return response.data
                });

            // Get current date for Dublin.
            const formattedDate = calculateDate(+1);

            // Pick a random word that hasn't been selected before.
            const word = await pickWordOfTheDay(formattedDate);

            try {
                // Translate word to English.
                const wotd: string = await translateText(word, 'bg', 'en');
                const wordTransliteration: string = await transliterateBulgarian(word);
                console.log("Word of the day: " + word + " (" + wotd + ")");

                // Send http requests simultaneously.
                await axios.all([getWordDefinition(wotd), getExampleSentence(wotd)])
                    .then(axios.spread(async (definitions, examples) => {
                        if (definitions.status === 200 && examples.status === 200) {
                            const wordDef = definitions.data.find((definition: any) =>
                                // Return the first word definition that's not undefined. 
                                definition.text !== undefined
                            );

                            const exampleSentence = examples.data.examples.find((example: any) =>
                                // Return the first example sentence that's not undefined.
                                example.text !== undefined
                            );

                            const wordType = wordDef.partOfSpeech;
                            const wordDefinition = stripHtml(wordDef.text);
                            const exampleSentenceEN = stripHtml(exampleSentence.text);

                            // Translate English to Bulgarian.
                            const exampleSentenceBG = await translateText(exampleSentenceEN, 'en', 'bg');

                            // Save audio of word pronounciation to Google Cloud Storage.
                            const pronunciationURL = await textToSpeech(speechToken, word, formattedDate + '.mpeg');

                            // Insert the new word of the day to the database with formatted_date as key and WordOfTheDay object as value.
                            const wordOfTheDay = new WordOfTheDay(formattedDate, word, wordTransliteration, wordType, wordDefinition,
                                exampleSentenceEN, exampleSentenceBG, pronunciationURL);
                            await admin.database().ref('wordOfTheDay').child(formattedDate).set(wordOfTheDay);
                        }
                    }));
            } catch (err) {
                console.error(err);
            }
        });

// https://www.techrepublic.com/article/convert-the-local-time-to-another-time-zone-with-this-javascript/
function calculateDate(offset: number): string {
    // Create Date object for current location.
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);

    // Create new Date object for different city using supplied offset.
    const nd = new Date(utc + (3600000 * offset));
    const day = nd.getDate();
    const month = nd.getMonth() + 1;
    const year = nd.getFullYear();

    // Return date as string.
    return day + '-' + month + '-' + year;
}

// Google Cloud Translation API.
async function translateText(text: string, sourceLang: string, targetLang: string): Promise<string> {
    let translation: string = "";
    await translate
        .translate(text, { from: sourceLang, to: targetLang })
        .then((results: any) => {
            translation = results[0].startsWith("the ") ? results[0].substring(4) : results[0]
        })
        .catch((err: any) => {
            console.error(err)
        });

    return translation;
}

function transliterateBulgarian(bg: string): string {
    // Replace Bulgarian letters with corresponding English letters.
    // This is used to make pronouncing Bulgarian words easier for learners. 
    let en = bg.replace(/а/gi, "a");
    en = en.replace(/б/gi, "b");
    en = en.replace(/в/gi, "v");
    en = en.replace(/г/gi, "g");
    en = en.replace(/д/gi, "d");
    en = en.replace(/е/gi, "e");
    en = en.replace(/ж/gi, "zh");
    en = en.replace(/з/gi, "z");
    en = en.replace(/и/gi, "i");
    en = en.replace(/й/gi, "y");
    en = en.replace(/к/gi, "k");
    en = en.replace(/л/gi, "l");
    en = en.replace(/м/gi, "m");
    en = en.replace(/н/gi, "n");
    en = en.replace(/о/gi, "o");
    en = en.replace(/п/gi, "p");
    en = en.replace(/р/gi, "r");
    en = en.replace(/с/gi, "s");
    en = en.replace(/т/gi, "t");
    en = en.replace(/у/gi, "u");
    en = en.replace(/ф/gi, "f");
    en = en.replace(/х/gi, "h");
    en = en.replace(/ц/gi, "ts");
    en = en.replace(/ч/gi, "ch");
    en = en.replace(/ш/gi, "sh");
    en = en.replace(/щ/gi, "sht");
    en = en.replace(/ъ/gi, "а");
    en = en.replace(/ь/gi, "y");
    en = en.replace(/ю/gi, "yu");
    en = en.replace(/я/gi, "ya");

    return en;
}

// Gets an access token.
async function getSpeechAccessToken(subscriptionKey: string) {
    return await axios.post('https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken',
        null, {
        headers: {
            'Ocp-Apim-Subscription-Key': subscriptionKey
        }
    });
}

async function textToSpeech(accessToken: string, text: string, fileName: string): Promise<string> {
    // Create the SSML request.
    const xml_body = xmlbuilder.create('speak')
        .att('version', '1.0')
        .att('xml:lang', 'bg-BG')
        .ele('voice')
        .att('xml:lang', 'bg-BG')
        .att('xml:gender', 'Male')
        .att('name', 'bg-BG-Ivan')
        .txt(text)
        .end();
    // Convert the XML into a string to send in the TTS request.
    const body = xml_body.toString();

    // Google Cloud Storage bucket for the app.
    const bucket = storage.bucket('learnbulgarian-8e7ea.appspot.com');

    await axios.post('https://northeurope.tts.speech.microsoft.com/cognitiveservices/v1', body, {
        headers: {
            'Authorization': 'Bearer ' + accessToken,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-16khz-32kbitrate-mono-mp3',
            'cache-control': 'no-cache'
        },
        responseType: 'stream'
    }).then(
        async response => {
            if (response.status === 200) {
                // Get audio file from the response and store it temporarily in /tmp dir.
                const tmp = os.tmpdir();
                const filePath = path.join(tmp, fileName);
                await response.data.pipe(fs.createWriteStream(filePath));
                traverseDir(tmp);

                // Upload the audio file to Google Cloud Storage.
                const localRS = fs.createReadStream(filePath);
                const remoteWS = bucket.file(fileName).createWriteStream({ contentType: 'audio/mpeg', resumable: false, predefinedAcl: 'publicRead' });
                await localRS.pipe(remoteWS)
                    .on('error', writeError => console.log(writeError))
                    .on('finish', () => {
                        console.log('Finished uploading file to Google Cloud Storage.');
                        remoteWS.end();
                        localRS.destroy();
                    });

                // Delete the temporary file from /tmp dir.
                fs.unlink(filePath, deleteError => {
                    if (deleteError) throw deleteError;
                    console.log('File deleted.');
                    traverseDir(tmp);
                });
            }
        },
        err => {
            console.log(err);
        });

    // Return URL to Google Cloud Storage location of the word.
    return `https://storage.googleapis.com/learnbulgarian-8e7ea.appspot.com/${fileName}`;
}

function traverseDir(dir: any) {
    console.log('Traversing directory: ' + dir);
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.lstatSync(fullPath).isDirectory()) {
            console.log(fullPath);
            traverseDir(fullPath);
        } else {
            console.log(fullPath);
        }
    });
}

async function pickWordOfTheDay(date: string): Promise<string> {
    // Picks random word.
    const word = _.sample([
        "акула",
        "бик",
        "бобър",
        "бръмбар",
        "видра",
        "врабче",
        "врана",
        "вълк",
        "гарван",
        "глиган",
        "горила",
        "гущер",
        "гълъб",
        "делфин",
        "заек",
        "елен",
        "животно",
        "жираф",
        "змия",
        "калинка",
        "камила",
        "канарче",
        "катерица",
        "кенгуру",
        "коза",
        "кокошка",
        "комар",
        "котка",
        "крава",
        "кукувица",
        "кълвач",
        "къртица",
        "лебед",
        "лисица",
        "лос",
        "лъв",
        "лястовица",
        "маймуна",
        "медуза",
        "мечка",
        "мишка",
        "молец",
        "морж",
        "мравка",
        "муха",
        "носорог",
        "октопод",
        "омар",
        "орел",
        "оса",
        "охлюв",
        "папагал",
        "патица",
        "паун",
        "паяк",
        "пеперуда",
        "пингвин",
        "плъх",
        "прасе",
        "прилеп",
        "пуйка",
        "пчела",
        "риба",
        "скакалец",
        "скарида",
        "сова",
        "сьомга",
        "таралеж",
        "тигър",
        "тюлен",
        "фазан",
        "хамстер",
        "хипопотам",
        "хлебарка",
        "чайка",
        "щраус",
        "щъркел",
        "язовец"
    ])!;

    const pastWords: string[] = [];
    const pastWordsRef = admin.database().ref('wordOfTheDay').child('pastWords');

    // Add past words from the Firebase Database to local array.
    await pastWordsRef.on('value', snap => {
        snap!.forEach(element => {
            pastWords.push(element.val());
        });
    });

    // Check if the chosen word has been picked before.
    if (pastWords.includes(word)) {
        // Recursive function call.
        await pickWordOfTheDay(date);
    };

    // Update the database of past words.
    await pastWordsRef.child(date).set(word);

    return word;
}

function getWordDefinition(word: string) {
    return axios.get(`https://api.wordnik.com/v4/word.json/${word}/definitions`, {
        params: {
            'api_key': functions.config().wordnik.apikey,
            'limit': 5,
            'useCanonical': true
        }
    })
}

function getExampleSentence(word: string) {
    return axios.get(`https://api.wordnik.com/v4/word.json/${word}/examples`, {
        params: {
            'api_key': functions.config().wordnik.apikey,
            'limit': 5,
            'useCanonical': true
        }
    })
}

function stripHtml(htmlString: string) {
    return htmlString.replace(/<[^>]+>/g, '');
}