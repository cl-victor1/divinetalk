import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2, R2_BUCKET_CONVERSATIONS } from '@/lib/cloudflare';
import OpenAI from 'openai';

export const runtime = 'edge';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const XI_API_KEY = process.env.ELEVENLABS_API_KEY;
const R2_PUBLIC_URL_CONVERSATIONS = process.env.R2_PUBLIC_URL_CONVERSATIONS;

const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!);


async function generateTitle(prompt: string): Promise<string> {
    const messages = [
      {
        role: "system",
        content: "You are a podcast metadata expert. Your task is to generate an engaging title based on the content provided."
      },
      {
        role: "user",
        content: `Please generate a concise, engaging title (max 80 characters) for a podcast with the provided transcript summary:
  
  Transcript Summary:
  ${prompt}
  
  
  Format your response exactly as follows:
    Title: [your title here]`
      }
    ];
  
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      temperature: 0.7,
    });
  
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Failed to generate title');
    }
  
    // Parse the response
    const titleMatch = content.match(/Title: (.*)/);
    
    return titleMatch?.[1] || prompt.substring(0, 80).trim()
  }


export async function POST(request: Request) {
    

  if (!XI_API_KEY || !supabaseUrl || !supabaseServiceRoleKey || !R2_PUBLIC_URL_CONVERSATIONS) {
    console.error('Missing environment variables:', {
      hasXiKey: !!XI_API_KEY,
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceRoleKey,
      hasR2Url: !!R2_PUBLIC_URL_CONVERSATIONS
    });
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  try {

    // Validate required fields
    const { userId, conversationId, createdAt, subscriptionTier } = await request.json();
    
    if (!conversationId || !createdAt) {
        return NextResponse.json(
          { 
            error: 'Missing required fields',
            missing: {
              conversationId: !conversationId,
              createdAt: !createdAt
            }
          },
          { status: 400 }
        );
      }

       
    console.log('[Edge] Fetching audio from ElevenLabs:', conversationId);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
        
    // 获取音频
      const audioResponse = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/audio`,
        {
          method: "GET",
          headers: {
            "xi-api-key": XI_API_KEY,
            Accept: "application/json",
          },
          signal: controller.signal
        }
      );

      if (!audioResponse.ok) {
        return NextResponse.json(
          { error: 'ElevenLabs API error' },
          { status: audioResponse.status }
        );
      }

      const audioBuffer = await audioResponse.arrayBuffer();
      const audioFilename = `conversation-${conversationId}.mp3`;

      // 获取其他信息
      const textResponse = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
        {
          method: "GET",
          headers: {
            "xi-api-key": XI_API_KEY,
            Accept: "application/json",
          },
          signal: controller.signal
        }
      );

      if (!textResponse.ok) {
        return NextResponse.json(
          { error: 'ElevenLabs API error' },
          { status: textResponse.status }
        );
      }

      const textData = await textResponse.json();
      const transcript_summary = textData.analysis.transcript_summary;
      const title = await generateTitle(transcript_summary);
      const transcript = textData.transcript;
      const subtitlesFilename = `subtitles-${conversationId}.json`;

      // Upload tasks
      try {
        console.log('Uploading to R2:', audioFilename);
        
        // Upload audio file to R2
        await r2.send(new PutObjectCommand({
          Bucket: R2_BUCKET_CONVERSATIONS,
          Key: audioFilename,
          Body: Buffer.from(audioBuffer),
          ContentType: 'audio/mp3',
        }));

        // Upload subtitles file to R2
        await r2.send(new PutObjectCommand({
          Bucket: R2_BUCKET_CONVERSATIONS,
          Key: subtitlesFilename,
          Body: JSON.stringify(transcript),
          ContentType: 'application/json',
        }));

        
        const audioUrl = `${R2_PUBLIC_URL_CONVERSATIONS}/${audioFilename}`;
        const subtitlesUrl = `${R2_PUBLIC_URL_CONVERSATIONS}/${subtitlesFilename}`;
        

        // Update Supabase
        console.log('Updating Supabase record');
        const { data: podcastData, error: updateError } = await supabase
          .from('user_podcasts')
          .insert({
            user_id: userId,
            audio_url: audioUrl,
            subtitles_url: subtitlesUrl,
            is_public: false,
            created_at: createdAt,
            slug: conversationId,
            title: title,
            description: transcript_summary,
          })
          .select()
          .single();

        if (updateError) {
          console.error('Supabase error:', updateError);
          throw new Error(`Failed to update podcast record: ${updateError.message}`);
        }


        return NextResponse.json({
          success: true,
          audioUrl,
          subtitlesUrl,
          podcastData
        });

      } catch (error) {
        console.error('R2 or Supabase error:', error);
        throw error;
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('[Edge] Request timed out after 2 minutes');
        return NextResponse.json(
          { error: 'Request timed out' },
          { status: 408 }
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    

  } catch (error) {
    console.error('Error handling conversation upload:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        details: error
      },
      { status: 500 }
    );
  }
} 