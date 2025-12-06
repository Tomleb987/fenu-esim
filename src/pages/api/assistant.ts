// pages/api/assistant.ts
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { messages } = req.body;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        /* votre system prompt ici ou importé */, 
        ...messages
      ],
    });

    res.status(200).json(response.choices[0].message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
