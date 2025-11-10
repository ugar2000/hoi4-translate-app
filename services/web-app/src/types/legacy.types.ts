// Legacy types from the original types.ts file

export enum LANGUAGE_CODES {
    ENGLISH = 'l_english',
    FRENCH = 'l_french',
    SPANISH = 'l_spanish',
    GERMAN = 'l_german',
    ITALIAN = 'l_italian',
    DUTCH = 'l_dutch',
    PORTUGUESE = 'l_portuguese',
    RUSSIAN = 'l_russian',
}

export interface LineItem {
    code: string;
    text: string;
    translatedText?: string;
    lineNo?: number;
}

export interface CaretPosition {
    top: number;
    left: number;
    height: number;
}

export interface CaretPositionOptions {
    debug?: boolean | undefined;
}
