export default async function handler(req: any, res: any) {
  // 只允许GET请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.SUNO_API_KEY || 'sk-yTXzuv2mvPRNDlQ7yztAApU6JcOGxGJjWeXsxa0pddjA3xe3';
    const baseUrl = 'https://api.apicore.ai';

    // 简单的健康检查请求
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    const isHealthy = response.status < 500;
    
    return res.status(200).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      api_status: response.status,
      message: isHealthy ? 'API服务正常' : 'API服务异常'
    });

  } catch (error) {
    console.error('健康检查失败:', error);
    return res.status(200).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : '未知错误',
      message: 'API服务不可用'
    });
  }
} 