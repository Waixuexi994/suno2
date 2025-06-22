import type { VercelRequest, VercelResponse } from '@vercel/node';

interface MusicGenerationRequest {
  prompt: string;
  model?: string;
  webhook_url?: string;
}

interface MusicGenerationResponse {
  code: string;
  message: string;
  data: string; // task_id
}

export default async function handler(
  req: any,
  res: any
) {
  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, model = 'suno-v3.5', webhook_url } = req.body as MusicGenerationRequest;

    if (!prompt) {
      return res.status(400).json({ error: '音乐描述不能为空' });
    }

    const apiKey = process.env.SUNO_API_KEY || 'sk-yTXzuv2mvPRNDlQ7yztAApU6JcOGxGJjWeXsxa0pddjA3xe3';
    const baseUrl = 'https://api.apicore.ai';

    // 构建请求体，包含webhook URL
    const requestBody: any = {
      model,
      prompt,
      stream: false
    };

    // 如果提供了webhook URL，添加到请求中
    if (webhook_url) {
      requestBody.webhook_url = webhook_url;
    }

    console.log('🎵 发起音乐生成请求:', { prompt, model, webhook_url: !!webhook_url });

    const response = await fetch(`${baseUrl}/suno/submit/music`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API请求失败:', response.status, errorText);
      
      return res.status(response.status).json({
        error: `音乐生成失败: ${response.status}`,
        details: errorText
      });
    }

    const result: MusicGenerationResponse = await response.json();
    console.log('✅ 音乐生成任务创建成功:', result);

    // 返回任务ID
    return res.status(200).json({
      success: true,
      task_id: result.data,
      message: webhook_url ? '任务已创建，将通过webhook通知结果' : '任务已创建，请轮询获取结果'
    });

  } catch (error) {
    console.error('💥 服务器错误:', error);
    return res.status(500).json({
      error: '服务器内部错误',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
} 