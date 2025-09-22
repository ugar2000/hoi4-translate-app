"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
const MICROSOFT_TRANSLATOR_KEY = process.env.MICROSOFT_TRANSLATOR_KEY;
const MICROSOFT_TRANSLATOR_REGION = process.env.MICROSOFT_TRANSLATOR_REGION;
const MICROSOFT_TRANSLATOR_URL = 'https://api.cognitive.microsofttranslator.com/translate';
const LANGUAGE_CODE_MAP = {
    'l_english': 'en',
    'l_french': 'fr',
    'l_german': 'de',
    'l_spanish': 'es',
    'l_polish': 'pl',
    'l_russian': 'ru',
    'l_turkish': 'tr',
    'l_portuguese': 'pt',
    'l_brazilian': 'pt-br',
    'l_chinese': 'zh-Hans',
    'l_japanese': 'ja',
    'l_korean': 'ko',
    'l_italian': 'it',
    'l_dutch': 'nl',
    'l_finnish': 'fi',
    'l_swedish': 'sv',
    'l_czech': 'cs',
    'l_hungarian': 'hu',
    'l_romanian': 'ro',
    'l_danish': 'da',
    'l_norwegian': 'nb',
    'l_ukrainian': 'uk',
    'l_greek': 'el',
    'l_bulgarian': 'bg',
    'l_estonian': 'et',
    'l_latvian': 'lv',
    'l_lithuanian': 'lt',
    'l_slovak': 'sk',
    'l_slovenian': 'sl',
    'l_indonesian': 'id',
    'l_arabic': 'ar',
    'l_simplified_chinese': 'zh-Hans',
    'l_traditional_chinese': 'zh-Hant'
};
function convertLanguageCode(paradoxCode) {
    const microsoftCode = LANGUAGE_CODE_MAP[paradoxCode.toLowerCase()];
    if (!microsoftCode) {
        throw new Error(`Unsupported language code: ${paradoxCode}`);
    }
    return microsoftCode;
}
app.post('/translate', async (req, res) => {
    try {
        const { text, targetLanguage } = req.body;
        if (!text || !targetLanguage) {
            return res.status(400).json({ error: 'Text and target language are required' });
        }
        if (!MICROSOFT_TRANSLATOR_KEY) {
            return res.status(500).json({ error: 'Microsoft Translator API key not configured' });
        }
        let microsoftTargetLang;
        try {
            microsoftTargetLang = convertLanguageCode(targetLanguage);
        }
        catch (error) {
            return res.status(400).json({ error: error.message });
        }
        console.log('Translating:', text);
        console.log('Target language:', targetLanguage, '→', microsoftTargetLang);
        const response = await axios_1.default.post(`${MICROSOFT_TRANSLATOR_URL}?api-version=3.0&to=${microsoftTargetLang}`, [{
                Text: text
            }], {
            headers: {
                'Ocp-Apim-Subscription-Key': MICROSOFT_TRANSLATOR_KEY,
                'Ocp-Apim-Subscription-Region': MICROSOFT_TRANSLATOR_REGION,
                'Content-Type': 'application/json',
                'X-ClientTraceId': generateTraceId()
            }
        });
        const translatedText = response.data[0].translations[0].text;
        console.log('Translation result:', translatedText);
        res.json({ translatedText });
    }
    catch (error) {
        console.error('Translation error:', error);
        if (axios_1.default.isAxiosError(error)) {
            console.error('Response data:', error.response?.data);
            console.error('Response status:', error.response?.status);
        }
        res.status(500).json({ error: 'Translation failed' });
    }
});
// Generate a unique trace ID for Microsoft Translator requests
function generateTraceId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
const port = process.env.PORT || 3004;
app.listen(port, () => {
    console.log(`Microsoft Translator service listening on port ${port}`);
});
//# sourceMappingURL=index.js.map