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

const pastWordsRef = admin.database().ref('wordOfTheDay').child('past');
const currentWOTDRef = admin.database().ref('wordOfTheDay').child('current')

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
            const wordBG = await pickWordOfTheDay();
            console.log(wordBG);

            try {
                // Translate word.
                const wotdEN = await translateText(wordBG, 'bg', 'en');
                const wotdES = await translateText(wordBG, 'bg', 'es');
                const wotdRU = await translateText(wordBG, 'bg', 'ru');

                const wordTransliterationBG: string = transliterateBulgarian(wordBG);
                const wordTransliterationEN: string = wotdEN;
                const wordTransliterationRU: string = transliterateRussian(wotdRU);
                const wordTransliterationES: string = transliterateSpanish(wotdES);

                console.log("Word of the day: " + wordBG + " (" + wotdEN + ")");
                console.log("Word of the day: " + wordBG + " (" + wotdES + ")");
                console.log("Word of the day: " + wordBG + " (" + wotdRU + ")");

                // Send http requests simultaneously.
                await axios.all([getWordDefinition(wotdEN), getExampleSentence(wotdEN)])
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

                            const wordType = !wordDef.partOfSpeech ? "noun" : wordDef.partOfSpeech

                            // Translate definition.
                            const wordDefinitionEN = stripHtml(wordDef.text);
                            const wordDefinitionBG = await translateText(wordDefinitionEN, 'en', 'bg');
                            const wordDefinitionRU = await translateText(wordDefinitionEN, 'en', 'ru');
                            const wordDefinitionES = await translateText(wordDefinitionEN, 'en', 'es');

                            // Translate sentence.
                            const exampleSentenceEN = stripHtml(exampleSentence.text);
                            const exampleSentenceBG = await translateText(exampleSentenceEN, 'en', 'bg');
                            const exampleSentenceRU = await translateText(exampleSentenceEN, 'en', 'ru');
                            const exampleSentenceES = await translateText(exampleSentenceEN, 'en', 'es');

                            // Save audio of word pronounciations to Google Cloud Storage.
                            const pronunciationURL_BG = await textToSpeech(speechToken, wordBG, formattedDate, 'bg');
                            const pronunciationURL_EN = await textToSpeech(speechToken, wotdEN, formattedDate, 'en');
                            const pronunciationURL_RU = await textToSpeech(speechToken, wotdRU, formattedDate, 'ru');
                            const pronunciationURL_ES = await textToSpeech(speechToken, wotdES, formattedDate, 'es');

                            // Create a WOTD object.
                            const wordOfTheDay = new WordOfTheDay(formattedDate, wordBG, wotdEN, wotdRU, wotdES,
                                wordTransliterationBG, wordTransliterationEN, wordTransliterationRU, wordTransliterationES,
                                wordType, wordDefinitionBG, wordDefinitionEN, wordDefinitionRU,
                                wordDefinitionES, exampleSentenceEN, exampleSentenceBG, exampleSentenceRU,
                                exampleSentenceES, pronunciationURL_BG, pronunciationURL_EN, pronunciationURL_RU,
                                pronunciationURL_ES);

                            // Insert the new WOTD to the database.
                            await currentWOTDRef.set(wordOfTheDay);

                            // Update the database of past words.
                            await pastWordsRef.child(formattedDate).set(wordOfTheDay);
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
            // Translated word may start with 'the/an/a';
            if (results[0].startsWith("the ") || results[0].startsWith("a ") || results[0].startsWith("an ")) {
                // Remove article from the string.
                translation = results[0].split(' ').pop();
            }
            else translation = results[0];
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

function transliterateRussian(ru: string): string {
    // Replace Russian letters with corresponding English letters.
    // This is used to make pronouncing Russian words easier for learners. 
    let en = ru.replace(/а/gi, "a");
    en = en.replace(/б/gi, "b");
    en = en.replace(/в/gi, "v");
    en = en.replace(/г/gi, "g");
    en = en.replace(/д/gi, "d");
    en = en.replace(/е/gi, "e");
    en = en.replace(/ё/gi, "e");
    en = en.replace(/ж/gi, "zh");
    en = en.replace(/з/gi, "z");
    en = en.replace(/и/gi, "i");
    en = en.replace(/й/gi, "i");
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
    en = en.replace(/х/gi, "kh");
    en = en.replace(/ц/gi, "ts");
    en = en.replace(/ч/gi, "ch");
    en = en.replace(/ш/gi, "sh");
    en = en.replace(/щ/gi, "shch");
    en = en.replace(/ъ/gi, "\"");
    en = en.replace(/ы/gi, "y");
    en = en.replace(/ь/gi, "'");
    en = en.replace(/э/gi, "e");
    en = en.replace(/ю/gi, "iu");
    en = en.replace(/я/gi, "ia");

    return en;
}

function transliterateSpanish(es: string): string {
    // Replace Spanish letters with corresponding English letters.
    // This is used to make pronouncing Spanish words easier for learners. 
    let en = es.replace(/h/gi, "'");
    en = en.replace(/a/gi, "ah");
    en = en.replace(/á/gi, "áh");
    en = en.replace(/ll/gi, "y");
    en = en.replace(/e/gi, "eh");
    en = en.replace(/è/gi, "èh");
    en = en.replace(/o/gi, "oh");
    en = en.replace(/ó/gi, "óh");
    en = en.replace(/ai/gi, "ay");
    en = en.replace(/all/gi, "ay");
    en = en.replace(/ay/gi, "ay");
    en = en.replace(/ca/gi, "ka");
    en = en.replace(/co/gi, "ko");
    en = en.replace(/có/gi, "kó");
    en = en.replace(/cu/gi, "ku");
    en = en.replace(/ce/gi, "se");
    en = en.replace(/ci/gi, "si");
    en = en.replace(/ch/gi, "ch");
    en = en.replace(/d/gi, "th");
    en = en.replace(/ge/gi, "he");
    en = en.replace(/gue/gi, "ge");
    en = en.replace(/gué/gi, "gé");
    en = en.replace(/gui/gi, "gee");
    en = en.replace(/gua/gi, "gwa");
    en = en.replace(/güe/gi, "gwe");
    en = en.replace(/güi/gi, "gwi");
    en = en.replace(/guo/gi, "gwo");
    en = en.replace(/gi/gi, "hee");
    en = en.replace(/j/gi, "h");
    en = en.replace(/ñ/gi, "ny");
    en = en.replace(/qu/gi, "k");
    en = en.replace(/z/gi, "s");
    en = en.replace(/u/gi, "oo");
    en = en.replace(/i/gi, "ee");
    en = en.replace(/í/gi, "ee");
    if (en.startsWith("v")) en = en.replace(/v/gi, "b");

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

async function textToSpeech(accessToken: string, text: string, fileName: string, language: string): Promise<string> {
    let name: string;
    let lang: string;

    // Define full filename.
    const fullFileName = fileName + `-${language}.mpeg`;

    // Determine what language and which speaker to use for pronunciations.
    switch (language) {
        case "en":
            name = "en-GB-George-Apollo";
            lang = "en-GB";
            break;
        case "bg":
            name = "bg-BG-Ivan";
            lang = "bg-BG";
            break;
        case "es":
            name = "es-ES-Pablo-Apollo";
            lang = "es-ES";
            break;
        case "ru":
            name = "ru-RU-Pavel-Apollo";
            lang = "ru-RU";
            break;
        default:
            name = "bg-BG-Ivan";
            lang = "bg-BG";

    }

    // Create the SSML request.
    const xml_body = xmlbuilder.create('speak')
        .att('version', '1.0')
        .att('xml:lang', lang)
        .ele('voice')
        .att('xml:lang', lang)
        .att('xml:gender', 'Male')
        .att('name', name)
        .txt(text)
        .end();
    // Convert the XML into a string to send in the TTS request.
    const body = xml_body.toString();

    // Google Cloud Storage bucket for the app.
    const bucket = storage.bucket('lingvino.appspot.com');

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
                const filePath = path.join(tmp, fullFileName);
                await response.data.pipe(fs.createWriteStream(filePath));
                traverseDir(tmp);

                // Upload the audio file to Google Cloud Storage.
                const localRS = fs.createReadStream(filePath);
                const remoteWS = bucket.file(fullFileName).createWriteStream({ contentType: 'audio/mpeg', resumable: false, predefinedAcl: 'publicRead' });
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
    return `https://storage.googleapis.com/lingvino.appspot.com/${fullFileName}`;
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

async function pickWordOfTheDay(): Promise<string> {
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

    // Retrieve all past WOTDs.
    const pastWords: any[] = [];
    await pastWordsRef.once('value', snap => {
        snap!.forEach(el => {
            pastWords.push(el.val());
        });
    });

    // Check if the chosen word has been picked before.
    if (pastWords.some(w => w.word === word)) {
        // Recursive function call.
        console.log(`word ${word} already picked.`)
        return pickWordOfTheDay();
    } else {
        console.log(`word ${word} hasn't been picked before.`)
        return word;
    }
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