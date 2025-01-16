import express, { Request, Response } from 'express';
import OpenAI from 'openai';
import Queue from 'bull';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface TranslationJob {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  rowId: string;
}

interface TranslationResult {
  type: 'translation';
  rowId: string;
  translatedText: string;
}

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(REDIS_URL);
const translationQueue = new Queue<TranslationJob>('translation', REDIS_URL);

async function translateText(text: string, sourceLanguage: string, targetLanguage: string): Promise<string> {
  const systemPrompt = `You are a professional translator for Paradox games.
Follow these rules strictly:
1. Translate text naturally while preserving all formatting
2. Do not modify any placeholders in curly braces like {abc123}
3. Maintain game-specific terminology
4. Translate from ${sourceLanguage} to ${targetLanguage}
5. Keep the meaning and tone consistent with the game's style
6. Only respond with the translated text, nothing else`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: text
      }
    ],
    temperature: 0.3,
    top_p: 1,
  });

  return completion.choices[0].message.content ?? text;
}

translationQueue.process(async (job) => {
  try {
    const { text, sourceLanguage, targetLanguage, rowId } = job.data;
    await job.progress(50);
    
    console.log('Translating:', text);
    console.log('Target language:', targetLanguage);

    const translatedText = await translateText(text, sourceLanguage, targetLanguage);
    
    console.log('Translation result:', translatedText);

    const translationResult: TranslationResult = {
      type: 'translation',
      rowId,
      translatedText
    };

    await redis.publish('translation-results', JSON.stringify(translationResult));
    return translationResult;
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
});

app.post('/translate', async (req: Request, res: Response) => {
  try {
    const { text, targetLanguage } = req.body;

    if (!text || !targetLanguage) {
      return res.status(400).json({ error: 'Text and target language are required' });
    }

    console.log('Translating:', text);
    console.log('Target language:', targetLanguage);

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a professional translator. Translate the following text to ${targetLanguage}. 
                   Maintain all formatting and special characters exactly as they appear. 
                   Do not modify any placeholders in curly braces like {abc123}.
                   Only respond with the translated text, nothing else.`
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.3,
    });

    const translatedText = completion.choices[0].message.content?.trim() || '';
    console.log('Translation result:', translatedText);

    res.json({ translatedText });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'Translation failed' });
  }
});

const port = process.env.PORT || 3002;
app.listen(port, () => {
  console.log(`Translation service listening on port ${port}`);
});

console.log('Translation service is running...');
