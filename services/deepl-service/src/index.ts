import express, { Request, Response } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const MICROSOFT_TRANSLATOR_KEY = process.env.MICROSOFT_TRANSLATOR_KEY;
const MICROSOFT_TRANSLATOR_REGION = process.env.MICROSOFT_TRANSLATOR_REGION;
const MICROSOFT_TRANSLATOR_URL = 'https://api.cognitive.microsofttranslator.com/translate';

const LANGUAGE_CODE_MAP: Record<string, string> = {
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
  const microsoftCode = LANGUAGE_CODE_MAP[paradoxCode.toLowerCase()];
  if (!microsoftCode) {
    throw new Error(`Unsupported language code: ${paradoxCode}`);
  }
  return microsoftCode;
}

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy', service: 'microsoft-translator' });
});

app.post('/translate', async (req: Request<{}, {}, TranslationRequest>, res: Response<TranslationResponse | ErrorResponse>) => {
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
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }

    console.log('Translating:', text);
    console.log('Target language:', targetLanguage, '→', microsoftTargetLang);

    const response = await axios.post(
      `${MICROSOFT_TRANSLATOR_URL}?api-version=3.0&to=${microsoftTargetLang}`,
      [{
        Text: text
      }],
      {
        headers: {
          'Ocp-Apim-Subscription-Key': MICROSOFT_TRANSLATOR_KEY,
          'Ocp-Apim-Subscription-Region': MICROSOFT_TRANSLATOR_REGION,
          'Content-Type': 'application/json',
          'X-ClientTraceId': generateTraceId()
        }
      }
    );

    const translatedText = response.data[0].translations[0].text;
    console.log('Translation result:', translatedText);

    res.json({ translatedText });
  } catch (error) {
    console.error('Translation error:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
    }
    res.status(500).json({ error: 'Translation failed' });
  }
});

// Generate a unique trace ID for Microsoft Translator requests
function generateTraceId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

const port = process.env.PORT || 3004;
app.listen(port, () => {
  console.log(`Microsoft Translator service listening on port ${port}`);
});
