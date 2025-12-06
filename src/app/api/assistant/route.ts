import { OpenAI } from 'openai';
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { systemPrompt } from './systemPrompt';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = 'edge'; // <--- Indispensable pour la vitesse et éviter les timeouts

export async function POST(req: Request) {
  const { messages } = await req.json();

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    stream: true,
    messages: [
        systemPrompt, 
        ...messages
    ],
  });

  const stream = OpenAIStream(response);
  return new StreamingTextResponse(stream);
}
