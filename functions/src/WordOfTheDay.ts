export class WordOfTheDay {
    word: string;
    wordTransliteration: string;
    wordType: string;
    wordDefinition: string;
    exampleSentenceEN: string | null;
    exampleSentenceBG: string | null;

    constructor(word: string, wordTransliteration: string, wordType: string, wordDefinition: string,
        exampleSentenceEN: string | null, exampleSentenceBG: string | null) {
        this.word = word;
        this.wordTransliteration = wordTransliteration;
        this.wordType = wordType;
        this.wordDefinition = wordDefinition;
        this.exampleSentenceEN = exampleSentenceEN;
        this.exampleSentenceBG = exampleSentenceBG;
    }
}