import {NextResponse} from "next/server";
// import { createClient } from '@supabase/supabase-js';
export const runtime = 'edge';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
// const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!);

// 检查是否需要重置计数
function shouldResetCount(lastResetDate: string): boolean {
    const lastReset = new Date(lastResetDate);
    const now = new Date();
    
    // 计算两个日期之间的毫秒差
    const diffInMs = now.getTime() - lastReset.getTime();
    
    // 转换为天数 (1000ms * 60s * 60min * 24h = 86400000ms per day)
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
    
    // 如果间隔超过30天，返回true
    return diffInDays > 30;
  }
  
  // 更新播客生成计数
  // async function updateGenerationCount(userId: string, currentCount: number, limit: number): Promise<boolean> {
  //   // First get the current record
  //   const { data: currentData } = await supabase
  //     .from('podcast_generation_counts')
  //     .select('count, last_reset_date')
  //     .eq('user_id', userId)
  //     .single();
  
  //   if (!currentData) {
  //     // If no record exists, create a new one
  //      await supabase
  //       .from('podcast_generation_counts')
  //       .upsert({
  //         user_id: userId,
  //         count: 1,
  //         last_reset_date: new Date().toISOString()
  //       });
  //       return false; // 计数未达到限制
  //   }
  
  //   // Check if we need to reset the count
  //   if (shouldResetCount(currentData.last_reset_date)) {
  //     // Reset count to 1 and update last_reset_date
  //     await supabase
  //       .from('podcast_generation_counts')
  //       .upsert({
  //         user_id: userId,
  //         count: 1,
  //         last_reset_date: new Date().toISOString()
  //       }).eq('user_id', userId);
  //       return true; // 重置计数
  //   } else {
  //     // Increment existing count
  //     if (currentCount < limit) {
  //      await supabase
  //       .from('podcast_generation_counts')
  //       .upsert({
  //         user_id: userId,
  //         count: currentCount + 1
  //       }).eq('user_id', userId);      
  //     } 
  //     return false; // 未重置计数
  //   }
  // }

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const subscriptionTier = searchParams.get('subscriptionTier');

    const agentId = process.env.ELEVENLABS_AGENT_ID
    const apiKey = process.env.ELEVENLABS_API_KEY

    const limit = 
          subscriptionTier === 'Trial' ? 5 : 
          subscriptionTier === 'Hobby' ? 40 : 
          subscriptionTier === 'Freelancer' ? 70 : 
          subscriptionTier === 'Professional' ? 100 :
          150;

    // 计算和控制播客生成量
    // if (userId) {
    //     // 已登录用户的现有验证逻辑
    //     let currentCount;
    //     const { data, error } = await supabase
    //       .from('podcast_generation_counts')
    //       .select('count')
    //       .eq('user_id', userId)
    //       .single();
  
    //     currentCount = data?.count || 0;
  
    //       // 更新生成计数
    //     const hasReset = await updateGenerationCount(userId, currentCount, limit);
  
    //     if (hasReset) {   
    //       // 更新生成计数后，重新获取当前计数
    //       const { data, error } = await supabase
    //       .from('podcast_generation_counts')
    //       .select('count')
    //       .eq('user_id', userId)
    //       .single();
  
    //     currentCount = data?.count || 0;
    //     }
      
        
    //     if (currentCount >= limit) {
    //         return NextResponse.json(
    //             { error: 'Monthly/Trial podcast generation limit reached' }, 
    //             { status: 403 }
    //         );
    //     }
    //   }

    if (!agentId) {
        throw Error('AGENT_ID is not set')
    }
    if (!apiKey) {
        throw Error('XI_API_KEY is not set')
    }
    try {
        
        const response = await fetch(
            `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
            {
                method: 'GET',
                headers: {
                    'xi-api-key': apiKey,
                }
            }
        );

        if (!response.ok) {
            throw new Error('Failed to get signed URL');
        }

        const data = await response.json();
        return NextResponse.json({signedUrl: data.signed_url})
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Failed to get signed URL' }, { status: 500 });
    }
}
