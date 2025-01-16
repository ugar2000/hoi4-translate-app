import Queue from 'bull';
import Redis from 'ioredis';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

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

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
const translationQueue = new Queue<TranslationJob>('translation', process.env.REDIS_URL ?? 'redis://localhost:6379');

async function translateText(text: string, sourceLanguage: string, targetLanguage: string): Promise<string> {
  const systemPrompt = `You are a professional translator specializing in Hearts of Iron 4 mod content. Follow these rules strictly:
1. Maintain all Paradox script variables and commands (anything in curly braces like {var} or §Y or £)
2. Keep all quotation marks in their original positions
3. Preserve all special characters and formatting
4. Translate from ${sourceLanguage} to ${targetLanguage}
5. Keep the meaning and tone consistent with the game's style`;

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
    temperature: 0.7,
    max_tokens: 150,
    top_p: 1,
  });

  return completion.choices[0].message.content ?? text;
}

translationQueue.process(async (job) => {
  try {
    const { text, sourceLanguage, targetLanguage, rowId } = job.data;
    await job.progress(50);
    
    const translatedText = await translateText(text, sourceLanguage, targetLanguage);
    
    const translationResult: TranslationResult = {
      type: 'translation',
      rowId,
      translatedText
    };
    
    await redis.publish('translations', JSON.stringify(translationResult));
    return translationResult;
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
});

console.log('Translation service is running...');
