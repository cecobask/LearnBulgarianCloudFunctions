import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as _ from 'lodash';
import { Translate } from '@google-cloud/translate';
import axios from 'axios';
import { WordOfTheDay } from './WordOfTheDay';

// Instantiate a Cloud Translation client.
const translate = new Translate({
    projectId: "learnbulgarian-8e7ea"
});

admin.initializeApp();


// Function to select a random word every day at 00:00 Dublin time.
exports.wordOfTheDay =
    functions.pubsub.schedule('00 00 * * *')
        .timeZone('Europe/Dublin')
        .onRun(async () => {
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
                "гриф",
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
                "куче",
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
                "слон",
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
                "щурец",
                "щъркел",
                "язовец"
            ])!;

            try {
                // Get current date for Dublin.
                const dublin_date = new Date(calculateDate(+1));
                const formatted_date = dublin_date.getDate() + "-" + (dublin_date.getMonth() + 1) + "-" + dublin_date.getFullYear();

                // Translate word to English.
                const wotd: string = await translateText(word, 'bg', 'en');
                const wordTransliteration: string = transliterateBulgarian(word);
                console.log("Word of the day: " + word + " (" + wotd + ")");

                // Google Dictionary API request to fetch definitions and example sentences.
                axios.get("https://googledictionaryapi.eu-gb.mybluemix.net/?define=" + wotd)
                    .then(async response => {
                        // Extract needed data from API request.
                        const data = response.data[0];
                        const wordType = Object.keys(data.meaning)[0];
                        const wordTypeObj = data.meaning[wordType][0];
                        const wordDefinition = wordTypeObj.definition;
                        const exampleSentenceEN = wordTypeObj.example !== undefined
                            ? wordTypeObj.example
                            : null;
                        const exampleSentenceBG = exampleSentenceEN !== null
                            ? await translateText(exampleSentenceEN, 'en', 'bg')
                            : null;

                        // Insert the new word of the day to the database with formatted_date as key and WordOfTheDay object as value for that key.
                        const wordOfTheDay = new WordOfTheDay(word, wordTransliteration, wordType, wordDefinition,
                            exampleSentenceEN, exampleSentenceBG);
                        await admin.database().ref('wordOfTheDay').child(formatted_date).set(wordOfTheDay);
                    })
                    .catch(error => {
                        console.log(error);
                    });
            } catch (err) {
                console.error("Write failed: " + err);
            }
        });

// https://www.techrepublic.com/article/convert-the-local-time-to-another-time-zone-with-this-javascript/
function calculateDate(offset: number) {
    // Create Date object for current location.
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);

    // Create new Date object for different city using supplied offset.
    const nd = new Date(utc + (3600000 * offset));

    // Return date as a string.
    return nd.toLocaleDateString().replace(new RegExp('/', 'g'), "-");
}

// Google Cloud Translation API.
async function translateText(text: string, sourceLang: string, targetLang: string): Promise<string> {
    let translation: string = "";
    await translate
        .translate(text, { from: sourceLang, to: targetLang })
        .then((results: any) => {
            translation = results[0]
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