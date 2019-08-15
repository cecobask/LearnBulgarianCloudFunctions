import { WordMeaning } from "./WordMeaning";

export class WordOfTheDay {
    word: string;
    wordTransliteration: string;
    wordMeanings: WordMeaning[];

    constructor(word: string, wordTransliteration: string, wordMeanings: WordMeaning[]) {
        this.word = word;
        this.wordTransliteration = wordTransliteration;
        this.wordMeanings = wordMeanings;
    }
}