import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const client = new OpenAI({
  apiKey: process.env.GROK_API_KEY,
  baseURL: "https://api.x.ai/v1",
});

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { context, roasteeHandle } = body;
    
    if (!context) {
      return NextResponse.json(
        { error: 'Context is required' },
        { status: 400 }
      );
    }
    
    // Create prompt with user's context
    const systemPrompt = `You are Grok, an AI with access to X (formerly Twitter) timeline data. 
    Your job is to create a funny, witty roast about a person based on their X account activity.
    The roast should be humorous but not overly mean or offensive.
    Focus on the aspects mentioned in the user's suggestions.
    Keep the roast concise (max 180 characters) and entertaining.
    Make the roasts based on the handle's X account activity.`;
    
    // Call Grok API
    const completion = await client.chat.completions.create({
      model: "grok-2-latest",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Generate a funny roast for X user @${roasteeHandle} based on these suggestions: ${context}`,
        },
      ],
    });
    
    // Extract and return the generated roast
    const roast = completion.choices[0].message.content;
    
    return NextResponse.json({ roast });
  } catch (error) {
    console.error('Error calling Grok API:', error);
    return NextResponse.json(
      { error: 'Failed to generate roast' },
      { status: 500 }
    );
  }
}