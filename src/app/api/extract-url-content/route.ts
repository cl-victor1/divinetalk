import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // 更新请求头以模拟最新的 Chrome 浏览器
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Referer': 'https://www.google.com/',
        'Connection': 'keep-alive'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // 移除不需要的元素
    $('script, style, nav, header, footer, iframe, noscript, ads, .ads, #ads, .advertisement').remove();

    // 尝试多种选择器来定位主要内容
    const contentSelectors = [
      'main',
      'article',
      '[role="main"]',
      '#main-content',
      '.main-content',
      '.post-content',
      '.article-content',
      '.entry-content',
      '#content',
      '.content'
    ];

    let content = '';
    
    // 遍历选择器直到找到内容
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length) {
        content = element.text();
        break;
      }
    }

    // 如果没有找到特定内容，回退到 body
    if (!content) {
      content = $('body').text();
    }

    // 清理文本内容
    content = content
      .replace(/\s+/g, ' ') // 合并多个空格
      .replace(/\n+/g, '\n') // 合并多个换行
      .replace(/[^\S\r\n]+/g, ' ') // 保留换行符但删除其他空白字符
      .replace(/\n\s+/g, '\n') // 删除行首空白
      .replace(/\s+\n/g, '\n') // 删除行尾空白
      .trim();

    // 如果内容太短，可能是提取失败
    if (content.length < 100) {
      throw new Error('Could not extract meaningful content from the webpage');
    }

    return NextResponse.json({ 
      content,
      source: url // 返回源 URL 作为参考
    });

  } catch (error) {
    console.error('Error extracting content:', error);
    
    let errorMessage = 'Failed to extract content from URL';
    
    if (error instanceof Error) {
      if (error.message.includes('CORS')) {
        errorMessage = 'This website does not allow content extraction due to CORS restrictions';
      } else if (error.message.includes('403')) {
        errorMessage = 'Access to this website is forbidden. It may have anti-scraping protection';
      } else if (error.message.includes('404')) {
        errorMessage = 'The webpage could not be found';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'The request timed out. The website may be slow or blocking our request';
      } else if (error.message.includes('browser')) {
        errorMessage = 'This website requires a modern browser. Try copying the content manually';
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 