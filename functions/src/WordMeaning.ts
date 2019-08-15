export class WordMeaning {
    type: string;
    meaning: [string, string | null, string | null];

    constructor(type: string, meaning: [string, string | null, string | null]) {
        this.type = type;
        this.meaning = meaning;
    }
}