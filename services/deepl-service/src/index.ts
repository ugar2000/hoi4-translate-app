import express, { Request, Response } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate';

// Mapping from Paradox language codes to DeepL language codes
const LANGUAGE_CODE_MAP: Record<string, string> = {
  'l_english': 'EN-GB',
  'l_french': 'FR',
  'l_german': 'DE',
  'l_spanish': 'ES',
  'l_polish': 'PL',
  'l_russian': 'RU',
  'l_turkish': 'TR',
  'l_portuguese': 'PT-PT',
  'l_brazilian': 'PT-BR',
  'l_chinese': 'ZH',
  'l_japanese': 'JA',
  'l_korean': 'KO',
  'l_italian': 'IT',
  'l_dutch': 'NL',
  'l_finnish': 'FI',
  'l_swedish': 'SV',
  'l_czech': 'CS',
  'l_hungarian': 'HU',
  'l_romanian': 'RO',
  'l_danish': 'DA',
  'l_norwegian': 'NB',
  'l_ukrainian': 'UK',
  'l_greek': 'EL',
  'l_bulgarian': 'BG',
  'l_estonian': 'ET',
  'l_latvian': 'LV',
  'l_lithuanian': 'LT',
  'l_slovak': 'SK',
  'l_slovenian': 'SL',
  'l_indonesian': 'ID',
  'l_arabic': 'AR',
  'l_simplified_chinese': 'ZH-HANS',
  'l_traditional_chinese': 'ZH-HANT'
};

interface TranslationRequest {
  text: string;
  targetLanguage: string;
}

interface TranslationResponse {
  translatedText: string;
}

interface ErrorResponse {
  error: string;
}

function convertLanguageCode(paradoxCode: string): string {
  const deeplCode = LANGUAGE_CODE_MAP[paradoxCode.toLowerCase()];
  if (!deeplCode) {
    throw new Error(`Unsupported language code: ${paradoxCode}`);
  }
  return deeplCode;
}

app.post('/translate', async (req: Request<{}, {}, TranslationRequest>, res: Response<TranslationResponse | ErrorResponse>) => {
  try {
    const { text, targetLanguage } = req.body;

    if (!text || !targetLanguage) {
      return res.status(400).json({ error: 'Text and target language are required' });
    }

    if (!DEEPL_API_KEY) {
      return res.status(500).json({ error: 'DeepL API key not configured' });
    }

    let deeplTargetLang;
    try {
      deeplTargetLang = convertLanguageCode(targetLanguage);
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }

    console.log('Translating:', text);
    console.log('Target language:', targetLanguage, '→', deeplTargetLang);

    const response = await axios.post(
      DEEPL_API_URL,
      {
        text: [text],
        target_lang: deeplTargetLang,
        preserve_formatting: true
      },
      {
        headers: {
          'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const translatedText = response.data.translations[0].text;
    console.log('Translation result:', translatedText);

    res.json({ translatedText });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'Translation failed' });
  }
});

const port = process.env.PORT || 3004;
app.listen(port, () => {
  console.log(`DeepL translation service listening on port ${port}`);
});
