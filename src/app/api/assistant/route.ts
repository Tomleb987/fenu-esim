import { OpenAI } from 'openai';
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { systemPrompt } from './systemPrompt';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Important pour la vitesse sur Vercel
export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      stream: true,
      messages: [
        systemPrompt, 
        ...messages
      ],
    });

    // Le "as any" corrige le bug de compatibilité TypeScript/Azure
    const stream = OpenAIStream(response as any);
    
    return new StreamingTextResponse(stream);
    
  } catch (error) {
    console.error("Erreur API:", error);
    return new Response(JSON.stringify({ error: "Erreur serveur" }), { status: 500 });
  }
}
