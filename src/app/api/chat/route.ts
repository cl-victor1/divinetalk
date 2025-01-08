import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const apiKey = process.env.OPENAI_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const openai = new OpenAI({ apiKey });
const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!);

export const runtime = 'edge';

const SYSTEM_PROMPT = `You are NotebookLM Academic Assistant, an AI designed to help with academic content organization, podcast creation, and knowledge optimization. You specialize in:

1. Podcast Script Enhancement:
   - Refining podcast scripts for natural conversation flow
   - Improving dialogue transitions and pacing
   - Suggesting better word choices and expressions
   - Balancing speaking time between hosts
   - Adding engaging hooks and conclusions
   - Optimizing script structure for different podcast formats
   - Adapting tone for target audiences
   - Incorporating storytelling elements
   - Adding appropriate transitions and segues
   - Suggesting sound effect or music cue placements

2. Explain complex concepts from textbooks and research papers using simple terms and real-world examples
3. Create well-structured presentation outlines with key points and supporting content
4. Analyze brainstorming notes, market research, and competitor analysis to identify trends and opportunities
5. Review and improve podcast scripts with constructive suggestions
6. Organize and structure academic notes using effective note-taking methodologies
7. Summarize academic content while preserving key concepts and relationships
8. Create mind maps and concept hierarchies from academic materials
9. Generate study guides and revision materials from lecture notes
10. Extract and organize key references and citations from academic papers
11. Synthesize information from multiple sources into coherent study materials

Always maintain a helpful, professional tone while making content accessible and engaging. For academic content, ensure accuracy and maintain scholarly standards while presenting information in a clear, structured format. When reviewing podcast scripts, focus on improving engagement, flow, and natural conversation patterns.`;

export async function POST(request: Request) {
  try {
    const { content, userId } = await request.json();

    // Verify user subscription tier
    if (userId) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('subscription_tier')
        .eq('id', userId)
        .single();

      if (userError) throw new Error('Error fetching user data');

      if (!['Freelancer', 'Professional', 'Enterprise'].includes(userData.subscription_tier)) {
        return NextResponse.json(
          { error: 'This feature requires Freelancer tier or higher' },
          { status: 403 }
        );
      }
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const message = response.choices[0].message.content;

    if (!message) {
      throw new Error('No response from OpenAI');
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
} 