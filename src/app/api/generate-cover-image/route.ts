import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const isLocalhost = (headers: Headers) => {
  const host = headers.get('host');
  return host?.includes('localhost') || host?.includes('127.0.0.1');
};

export async function POST(request: Request) {
  try {
    const { prompt, userId, subscriptionTier } = await request.json();

    // 修改验证逻辑，允许 localhost 访问
    if (!isLocalhost(request.headers) && (subscriptionTier === 'Hobby' || !userId)) {
      return NextResponse.json(
        { error: 'Feature not available in your current plan' },
        { status: 403 }
      );
    }

    // Generate image using DALL-E
    const response = await openai.images.generate({
      model: "dall-e-2",
      prompt: `Professional podcast cover art: ${prompt}`,
      n: 1,
      size: "512x512",
      quality: "standard"
    });

    const imageUrl = response.data[0].url;

    // Store the image URL in Supabase if needed
    // const supabase = createRouteHandlerClient({ cookies });
    // await supabase
    //   .from('podcast_covers')
    //   .insert([
    //     {
    //       user_id: userId,
    //       image_url: imageUrl,
    //       prompt,
    //     },
    //   ]);

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error('Error generating cover image:', error);
    return NextResponse.json(
      { error: 'Failed to generate cover image' },
      { status: 500 }
    );
  }
}

export const runtime = 'edge';