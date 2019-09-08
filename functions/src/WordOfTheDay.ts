export class WordOfTheDay {
    wordDate: string;
    word: string;
    wordTransliteration: string;
    wordType: string;
    wordDefinition: string;
    exampleSentenceEN: string | null;
    exampleSentenceBG: string | null;
    pronunciationURL: string;

    constructor(wordDate: string, word: string, wordTransliteration: string, wordType: string, wordDefinition: string,
        exampleSentenceEN: string | null, exampleSentenceBG: string | null, pronunciationURL: string) {
        this.wordDate = wordDate;
        this.word = word;
        this.wordTransliteration = wordTransliteration;
        this.wordType = wordType;
        this.wordDefinition = wordDefinition;
        this.exampleSentenceEN = exampleSentenceEN;
        this.exampleSentenceBG = exampleSentenceBG;
        this.pronunciationURL = pronunciationURL;
    }
}