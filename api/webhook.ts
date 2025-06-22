// 注意：在Vercel环境中，我们不能直接导入前端模块
// 所以这里重新定义必要的接口和枚举

enum TaskStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING', 
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE'
}

interface TaskResult {
  task_id: string;
  status: TaskStatus;
  progress?: string;
  tracks?: any[];
  error?: string;
}

// 简单的内存存储（注意：Vercel函数是无状态的，这只是演示）
const taskResults = new Map<string, TaskResult>();

export default async function handler(req: any, res: any) {
  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🎵 收到webhook回调:', JSON.stringify(req.body, null, 2));
    
    const { task_id, status, data, fail_reason, progress } = req.body;

    if (!task_id) {
      return res.status(400).json({ error: '缺少task_id' });
    }

    // 转换状态
    let taskStatus: TaskStatus;
    switch (status?.toUpperCase()) {
      case 'SUCCESS':
      case 'COMPLETED':
      case 'FINISHED':
        taskStatus = TaskStatus.SUCCESS;
        break;
      case 'FAILURE':
      case 'FAILED':
      case 'ERROR':
        taskStatus = TaskStatus.FAILURE;
        break;
      case 'PROCESSING':
      case 'RUNNING':
        taskStatus = TaskStatus.PROCESSING;
        break;
      default:
        taskStatus = TaskStatus.PENDING;
    }

    // 创建任务结果
    const taskResult: TaskResult = {
      task_id,
      status: taskStatus,
      progress: progress || (taskStatus === TaskStatus.SUCCESS ? '100%' : undefined),
      tracks: data,
      error: fail_reason
    };

    // 存储任务结果（注意：在生产环境中应该使用持久化存储）
    taskResults.set(task_id, taskResult);
    
    if (taskStatus === TaskStatus.SUCCESS && data && data.length > 0) {
      console.log('✅ 音乐生成成功:', {
        task_id,
        tracks: data.length,
        audio_urls: data.map((track: any) => track.audio_url)
      });
      
      // 这里可以添加其他通知逻辑
      // 例如：发送邮件、推送通知、更新数据库等
      
    } else if (taskStatus === TaskStatus.FAILURE) {
      console.error('❌ 音乐生成失败:', { task_id, fail_reason });
    } else {
      console.log('📊 任务状态更新:', { task_id, status: taskStatus, progress });
    }

    // 确认收到webhook
    return res.status(200).json({ 
      success: true, 
      message: 'Webhook received and processed',
      task_id,
      status: taskStatus
    });

  } catch (error) {
    console.error('💥 Webhook处理错误:', error);
    return res.status(500).json({
      error: '服务器内部错误',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
}

// 导出任务结果获取函数（供其他API使用）
export function getTaskResult(taskId: string): TaskResult | null {
  return taskResults.get(taskId) || null;
} 