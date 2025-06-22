// Suno AI音乐生成API服务
export interface MusicGenerationRequest {
  prompt: string;
  model?: string;
  stream?: boolean;
  webhook_url?: string; // 新增webhook支持
}

export interface MusicGenerationResponse {
  code: string;
  message: string;
  data: string; // task_id
}

// 根据实际API响应格式定义的音乐轨道接口
export interface MusicTrack {
  id: string;
  title: string;
  prompt: string;
  audio_url: string;
  image_url: string;
  image_large_url: string;
  video_url: string;
  duration: number;
  created_at: string;
  status: string;
  model_name: string;
  handle: string;
  display_name: string;
  state: string;
  clip_id: string;
  explicit: boolean;
  is_liked: boolean;
  is_public: boolean;
  tags: string;
  mv: string;
  metadata?: {
    type: string;
    prompt: string;
    stream: boolean;
    duration: number;
    is_remix: boolean;
    priority: number;
    can_remix: boolean;
    refund_credits: boolean;
    free_quota_category: string;
  };
}

export interface FetchTaskResponse {
  code: string;
  message: string;
  data: {
    task_id: string;
    action: string;
    status: string;
    fail_reason: string;
    submit_time: number;
    start_time: number;
    finish_time: number;
    progress: string;
    data: MusicTrack[];
  };
}

// 新增：任务状态枚举
export enum TaskStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING', 
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE'
}

// 新增：任务结果接口
export interface TaskResult {
  task_id: string;
  status: TaskStatus;
  progress?: string;
  tracks?: MusicTrack[];
  error?: string;
}

class MusicApiService {
  private readonly apiKey = 'sk-yTXzuv2mvPRNDlQ7yztAApU6JcOGxGJjWeXsxa0pddjA3xe3';
  
  // 检测是否在Vercel环境中
  private readonly isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
  
  // 开发环境使用代理，生产环境使用Vercel API或直接调用
  private readonly isDevelopment = import.meta.env.DEV;
  
  private readonly backupUrls = this.isDevelopment ? [
    '/api/apicore' // 开发环境代理路径
  ] : this.isVercel ? [
    '' // Vercel环境使用相对路径
  ] : [
    'https://api.apicore.ai' // 其他生产环境直接URL
  ];

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  // API路径 - 根据环境调整
  private readonly API_PATHS = {
    generate: this.isVercel ? '/api/generate-music' : '/suno/submit/music',
    fetch: this.isVercel ? '/api/fetch-task' : '/suno/fetch',
    webhook: this.isVercel ? '/api/webhook' : null
  };

  // 新增：获取webhook URL
  private getWebhookUrl(): string | null {
    if (!this.isVercel) return null;
    
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}`
        : null;
    
    return baseUrl ? `${baseUrl}/api/webhook` : null;
  }

  private handleHttpError(status: number, context: string, responseText?: string): Error {
    console.error(`HTTP错误 ${status} in ${context}:`, responseText);
    
    if (status === 503) {
      return new Error('🔧 音乐生成服务暂时维护中\n\n解决方案：\n• 请等待10-30分钟后重试\n• 检查网络连接\n• 如果问题持续，请联系客服');
    } else if (status === 502 || status === 504) {
      return new Error('🌐 服务器网关错误\n\n解决方案：\n• 网络不稳定，请稍后重试\n• 检查防火墙设置');
    } else if (status === 429) {
      return new Error('⚡ 请求过于频繁\n\n解决方案：\n• 请等待30秒后再试\n• 降低请求频率');
    } else if (status === 401) {
      return new Error('🔑 API认证失败\n\n可能原因：\n• API密钥已过期\n• 账户余额不足\n• 请联系管理员检查配置');
    } else if (status === 403) {
      return new Error('🚫 API访问被拒绝\n\n可能原因：\n• 余额不足\n• 权限不够\n• 请检查账户状态');
    } else if (status === 400) {
      return new Error('📝 请求格式错误\n\n解决方案：\n• 检查输入内容\n• 确保音乐描述合理');
    } else if (status >= 500) {
      return new Error('🖥️ 服务器内部错误\n\n解决方案：\n• 服务器临时故障\n• 请稍后重试');
    } else {
      return new Error(`❌ ${context}失败 (${status})\n\n请检查网络连接并重试`);
    }
  }

  // 带重试的网络请求
  private async fetchWithRetry(url: string, options: RequestInit, maxRetries = 2): Promise<Response> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 尝试第${attempt}次请求: ${url}`);
        
        // 创建超时控制器 - 减少超时时间以便更快失败重试
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒超时
        
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          // 添加模式设置
          mode: 'cors',
          credentials: 'omit',
        });
        
        clearTimeout(timeoutId);
        
        console.log(`📡 响应状态: ${response.status} ${response.statusText}`);
        
        // 如果请求成功或是客户端错误（4xx），直接返回
        if (response.ok || (response.status >= 400 && response.status < 500)) {
          return response;
        }
        
        // 服务器错误（5xx），记录并重试
        console.warn(`⚠️ 请求失败，状态码: ${response.status}，准备重试...`);
        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        
      } catch (error) {
        console.warn(`❌ 网络请求失败 (尝试 ${attempt}/${maxRetries}):`, error);
        
        if (error instanceof Error && error.name === 'AbortError') {
          lastError = new Error('⏰ 请求超时\n\n解决方案：\n• 检查网络连接\n• 稍后重试');
        } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          lastError = new Error('🌐 网络连接失败\n\n可能原因：\n• 网络不稳定\n• CORS策略阻止\n• 防火墙设置\n\n解决方案：\n• 检查网络连接\n• 尝试刷新页面');
        } else {
          lastError = error instanceof Error ? error : new Error('未知网络错误');
        }
      }
      
      // 如果不是最后一次尝试，等待后重试
      if (attempt < maxRetries) {
        const delay = 2000; // 固定2秒延迟
        console.log(`⏳ 等待${delay}ms后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError || new Error('网络请求失败');
  }

  // 尝试多个API端点
  private async tryMultipleEndpoints(path: string, options: RequestInit): Promise<Response> {
    let lastError: Error | null = null;
    
    console.log('🔧 尝试多个端点，路径:', path);
    console.log('🔧 可用端点:', this.backupUrls);
    console.log('🔧 开发环境:', this.isDevelopment);
    console.log('🔧 Vercel环境:', this.isVercel);
    
    for (const baseUrl of this.backupUrls) {
      try {
        const url = baseUrl ? `${baseUrl}${path}` : path; // Vercel环境baseUrl为空
        console.log(`🎯 完整请求URL: ${url}`);
        
        const response = await this.fetchWithRetry(url, options, 2);
        
        if (response.ok) {
          console.log(`✅ API端点${baseUrl || 'local'}响应成功`);
          return response;
        }
        
        // 记录错误但继续尝试下一个端点
        const errorText = await response.text();
        console.warn(`❌ API端点${baseUrl || 'local'}失败: ${response.status} - ${errorText}`);
        lastError = this.handleHttpError(response.status, `API调用 (${baseUrl || 'local'})`, errorText);
        
      } catch (error) {
        console.warn(`❌ API端点${baseUrl || 'local'}网络错误:`, error);
        lastError = error instanceof Error ? error : new Error('网络连接失败');
      }
    }
    
    throw lastError || new Error('💥 所有API端点都不可用\n\n可能原因：\n• 网络连接问题\n• 服务器维护中\n• CORS策略限制\n\n解决方案：\n• 检查网络连接\n• 稍后重试\n• 联系技术支持');
  }

  // 修改：音乐生成方法，支持webhook
  async generateMusic(request: MusicGenerationRequest): Promise<string> {
    console.log('🎵 开始生成音乐:', request);
    
    try {
      const webhookUrl = this.getWebhookUrl();
      
      // 构建请求体
      const requestBody = {
        ...request,
        model: request.model || 'suno-v3.5',
        stream: false,
        ...(webhookUrl && { webhook_url: webhookUrl })
      };

      console.log('🎯 请求体:', requestBody);
      console.log('🔗 Webhook URL:', webhookUrl);

      const response = await this.tryMultipleEndpoints(
        this.API_PATHS.generate,
        {
          method: 'POST',
          headers: this.isVercel ? {
            'Content-Type': 'application/json',
          } : this.getHeaders(),
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ 音乐生成失败:', response.status, errorText);
        throw this.handleHttpError(response.status, '音乐生成', errorText);
      }

      const result = await response.json();
      console.log('✅ 音乐生成响应:', result);

      // 根据响应格式提取task_id
      const taskId = result.task_id || result.data;
      
      if (!taskId) {
        throw new Error('❌ 未获取到任务ID');
      }

      console.log('🎫 任务ID:', taskId);
      console.log('📡 使用模式:', webhookUrl ? 'Webhook' : '轮询');
      
      return taskId;
      
    } catch (error) {
      console.error('💥 音乐生成失败:', error);
      throw error instanceof Error ? error : new Error('音乐生成失败');
    }
  }

  // 修改：获取任务状态
  async fetchTask(taskId: string): Promise<FetchTaskResponse['data']> {
    console.log('🔍 查询任务状态:', taskId);
    
    try {
      const url = this.isVercel 
        ? `${this.API_PATHS.fetch}?task_id=${taskId}`
        : this.API_PATHS.fetch;
      
      const response = await this.tryMultipleEndpoints(
        url,
        {
          method: 'GET',
          headers: this.isVercel ? {} : this.getHeaders(),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ 查询任务失败:', response.status, errorText);
        throw this.handleHttpError(response.status, '查询任务状态', errorText);
      }

      const result: FetchTaskResponse = await response.json();
      console.log('📊 任务状态响应:', result);

      if (result.code !== '200') {
        throw new Error(`任务查询失败: ${result.message}`);
      }

      return result.data;
      
    } catch (error) {
      console.error('💥 查询任务失败:', error);
      throw error instanceof Error ? error : new Error('查询任务失败');
    }
  }

  // 修改：轮询任务完成状态 - 缩短轮询时间和次数
  async pollTaskUntilComplete(
    taskId: string, 
    onProgress?: (progress: string, status: string, tracks?: MusicTrack[]) => void
  ): Promise<MusicTrack[]> {
    console.log('🔄 开始轮询任务:', taskId);
    
    const startTime = Date.now();
    let attempts = 0;
    const maxAttempts = this.isVercel ? 30 : 240; // Vercel环境减少轮询次数
    const pollInterval = this.isVercel ? 3000 : 5000; // Vercel环境增加轮询间隔
    const maxDuration = this.isVercel ? 5 * 60 * 1000 : 20 * 60 * 1000; // Vercel环境最多5分钟
    
    while (attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`🔍 轮询第${attempts}次 (最多${maxAttempts}次)`);
        
        // 检查是否超时
        if (Date.now() - startTime > maxDuration) {
          throw new Error(`⏰ 音乐生成超时 (${Math.round(maxDuration / 60000)}分钟)\n\n建议：\n• 简化音乐描述\n• 稍后重试`);
        }
        
        const taskData = await this.fetchTask(taskId);
        
        console.log(`📊 任务状态: ${taskData.status}, 进度: ${taskData.progress}`);
        
        // 调用进度回调
        if (onProgress) {
          onProgress(taskData.progress || '处理中...', taskData.status, taskData.data);
        }
        
        // 检查任务状态
        if (taskData.status === 'SUCCESS' && taskData.data && taskData.data.length > 0) {
          console.log('✅ 音乐生成成功!');
          console.log(`🎵 生成了${taskData.data.length}首音乐`);
          
          // 验证音频URL
          const validTracks = [];
          for (const track of taskData.data) {
            if (track.audio_url && await this.validateAudioUrl(track.audio_url)) {
              validTracks.push(track);
              console.log(`✅ 音频URL有效: ${track.title}`);
            } else {
              console.warn(`⚠️ 音频URL无效: ${track.title}`);
            }
          }
          
          if (validTracks.length === 0) {
            throw new Error('🎵 生成的音乐文件无法访问\n\n可能原因：\n• 音频还在处理中\n• 网络连接问题\n\n建议：\n• 稍后重试\n• 检查网络连接');
          }
          
          return validTracks;
        }
        
        if (taskData.status === 'FAILURE') {
          const errorMsg = taskData.fail_reason || '未知错误';
          console.error('❌ 音乐生成失败:', errorMsg);
          throw new Error(`🎵 音乐生成失败\n\n原因: ${errorMsg}\n\n建议：\n• 修改音乐描述\n• 重新尝试`);
        }
        
        // 等待下次轮询
        console.log(`⏳ 等待${pollInterval}ms后继续轮询...`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
      } catch (error) {
        console.error(`❌ 轮询第${attempts}次失败:`, error);
        
        // 如果是网络错误，继续重试
        if (error instanceof Error && (
          error.message.includes('网络') || 
          error.message.includes('超时') ||
          error.message.includes('连接')
        )) {
          console.log('🔄 网络错误，继续重试...');
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          continue;
        }
        
        // 其他错误直接抛出
        throw error;
      }
    }
    
    // 轮询次数用完
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    throw new Error(`⏰ 音乐生成超时 (${elapsed}秒)\n\n可能原因：\n• 服务器负载过高\n• 音乐描述过于复杂\n\n建议：\n• 简化音乐描述\n• 稍后重试`);
  }

  // 新增：获取任务结果（用于webhook模式）
  async getTaskResult(taskId: string): Promise<TaskResult> {
    try {
      const taskData = await this.fetchTask(taskId);
      
      let status: TaskStatus;
      switch (taskData.status) {
        case 'SUCCESS':
          status = TaskStatus.SUCCESS;
          break;
        case 'FAILURE':
          status = TaskStatus.FAILURE;
          break;
        case 'PROCESSING':
          status = TaskStatus.PROCESSING;
          break;
        default:
          status = TaskStatus.PENDING;
      }
      
      return {
        task_id: taskId,
        status,
        progress: taskData.progress,
        tracks: taskData.data,
        error: taskData.fail_reason
      };
    } catch (error) {
      return {
        task_id: taskId,
        status: TaskStatus.FAILURE,
        error: error instanceof Error ? error.message : '查询失败'
      };
    }
  }

  // 验证音频URL是否可访问
  async validateAudioUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        mode: 'no-cors' // 避免CORS问题
      });
      return true; // no-cors模式下，只要不抛异常就认为可访问
    } catch (error) {
      console.warn('音频URL验证失败:', url, error);
      return false;
    }
  }

  // 健康检查
  async healthCheck(): Promise<boolean> {
    try {
      console.log('🏥 开始API健康检查...');
      
      const response = await this.tryMultipleEndpoints(
        this.isVercel ? '/api/health' : '/health',
        {
          method: 'GET',
          headers: this.isVercel ? {} : this.getHeaders(),
        }
      );
      
      const isHealthy = response.ok;
      console.log(isHealthy ? '✅ API服务正常' : '❌ API服务异常');
      return isHealthy;
      
    } catch (error) {
      console.error('💥 健康检查失败:', error);
      return false;
    }
  }
}

export const musicApi = new MusicApiService();