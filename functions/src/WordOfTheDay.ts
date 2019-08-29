export class WordOfTheDay {
    word: string;
    wordTransliteration: string;
    wordType: string;
    wordDefinition: string;
    exampleSentenceEN: string | null;
    exampleSentenceBG: string | null;
    downloadURL: string;

    constructor(word: string, wordTransliteration: string, wordType: string, wordDefinition: string,
        exampleSentenceEN: string | null, exampleSentenceBG: string | null, downloadURL: string) {
        this.word = word;
        this.wordTransliteration = wordTransliteration;
        this.wordType = wordType;
        this.wordDefinition = wordDefinition;
        this.exampleSentenceEN = exampleSentenceEN;
        this.exampleSentenceBG = exampleSentenceBG;
        this.downloadURL = downloadURL;
    }
}