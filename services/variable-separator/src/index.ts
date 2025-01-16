import express from 'express';
import { VariableSeparator } from './variableSeparator';
import { addToQueue } from './queue';
import { SeparationResult } from './types';

const app = express();
app.use(express.json());

const separator = new VariableSeparator();

app.post('/separate', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const result: SeparationResult = separator.separateVariables(text);

    // Add variables to queue
    await Promise.all(
      result.variables.map(({ hash, value }) => addToQueue(hash, value))
    );

    res.json(result);
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/restore', (req, res) => {
  try {
    const { text, variables } = req.body;
    if (!text || !variables) {
      return res.status(400).json({ error: 'Text and variables are required' });
    }

    const restoredText = separator.restoreVariables(text, variables);
    res.json({ text: restoredText });
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const port = process.env.PORT || 3003;
app.listen(port, () => {
  console.log(`Variable separator service listening on port ${port}`);
});
