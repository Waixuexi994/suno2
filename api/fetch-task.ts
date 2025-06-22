export default async function handler(req: any, res: any) {
  // 只允许GET请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { task_id } = req.query;

    if (!task_id) {
      return res.status(400).json({ error: '缺少task_id参数' });
    }

    const apiKey = process.env.SUNO_API_KEY || 'sk-yTXzuv2mvPRNDlQ7yztAApU6JcOGxGJjWeXsxa0pddjA3xe3';
    const baseUrl = 'https://api.apicore.ai';

    console.log('🔍 查询任务状态:', task_id);

    const response = await fetch(`${baseUrl}/suno/fetch?task_id=${task_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 查询任务失败:', response.status, errorText);
      
      return res.status(response.status).json({
        error: `查询任务失败: ${response.status}`,
        details: errorText
      });
    }

    const result = await response.json();
    console.log('📊 任务状态:', result);

    return res.status(200).json(result);

  } catch (error) {
    console.error('💥 服务器错误:', error);
    return res.status(500).json({
      error: '服务器内部错误',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
} 