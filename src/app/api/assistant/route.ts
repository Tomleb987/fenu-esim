import { OpenAI } from 'openai';
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { systemPrompt } from './systemPrompt';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = 'edge';

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

  // --- CORRECTION ICI ---
  // On ajoute "as any" pour dire à TypeScript d'ignorer la petite différence de version
  const stream = OpenAIStream(response as any);
  
  return new StreamingTextResponse(stream);
}
