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

interface TranslationRequest {
  text: string;
  targetLanguage: string;
  mode?: 'translate' | 'post-process';
  context?: string;
}

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(REDIS_URL);
const translationQueue = new Queue<TranslationJob>('translation', REDIS_URL);

async function translateText(text: string, sourceLanguage: string, targetLanguage: string, mode: 'translate' | 'post-process' = 'translate', context: string = ''): Promise<string> {
  const systemPrompt = mode === 'post-process' 
    ? `You are a professional game translator and editor. Review and improve this ${targetLanguage} translation:
       1. Ensure gaming terminology is consistent
       2. Maintain the tone and style appropriate for games
       3. Preserve all special characters and formatting
       4. Only respond with the improved translation, nothing else
       ${context}`
    : `You are a professional translator specializing in game content. Translate this text to ${targetLanguage}:
       1. Maintain natural language flow
       2. Keep gaming terminology consistent
       3. Preserve all special characters and formatting
       4. Only respond with the translation, nothing else`;

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
    const { text, targetLanguage, mode = 'translate', context = '' } = req.body as TranslationRequest;

    if (!text || !targetLanguage) {
      return res.status(400).json({ error: 'Text and target language are required' });
    }

    console.log('Mode:', mode);
    console.log('Input text:', text);
    console.log('Target language:', targetLanguage);

    const translatedText = await translateText(text, '', targetLanguage, mode, context);
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
