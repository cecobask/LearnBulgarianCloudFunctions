export class WordOfTheDay {
    wordDate: string;
    wordBG: string;
    wordEN: string;
    wordRU: string;
    wordES: string;
    wordTransliteration: string;
    wordType: string;
    wordDefinitionBG: string;
    wordDefinitionEN: string;
    wordDefinitionRU: string;
    wordDefinitionES: string;
    exampleSentenceEN: string | null;
    exampleSentenceBG: string | null;
    exampleSentenceRU: string | null;
    exampleSentenceES: string | null;
    pronunciationURL_BG: string;
    pronunciationURL_EN: string;
    pronunciationURL_RU: string;
    pronunciationURL_ES: string;

    constructor(wordDate: string, wordBG: string, wordEN: string, wordRU: string, wordES: string,
        wordTransliteration: string, wordType: string,
        wordDefinitionBG: string, wordDefinitionEN: string, wordDefinitionRU: string, wordDefinitionES: string,
        exampleSentenceEN: string | null, exampleSentenceBG: string | null, exampleSentenceRU: string | null, exampleSentenceES: string | null,
        pronunciationURL_BG: string, pronunciationURL_EN: string, pronunciationURL_RU: string, pronunciationURL_ES: string) {
        this.wordDate = wordDate;
        this.wordBG = wordBG;
        this.wordEN = wordEN;
        this.wordRU = wordRU;
        this.wordES = wordES;
        this.wordTransliteration = wordTransliteration;
        this.wordType = wordType;
        this.wordDefinitionBG = wordDefinitionBG;
        this.wordDefinitionEN = wordDefinitionEN;
        this.wordDefinitionRU = wordDefinitionRU;
        this.wordDefinitionES = wordDefinitionES;
        this.exampleSentenceEN = exampleSentenceEN;
        this.exampleSentenceBG = exampleSentenceBG;
        this.exampleSentenceRU = exampleSentenceRU;
        this.exampleSentenceES = exampleSentenceES;
        this.pronunciationURL_BG = pronunciationURL_BG;
        this.pronunciationURL_EN = pronunciationURL_EN;
        this.pronunciationURL_RU = pronunciationURL_RU;
        this.pronunciationURL_ES = pronunciationURL_ES;
    }
}