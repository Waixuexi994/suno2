import { TaskStatus, TaskResult, MusicTrack } from './musicApi';

// 简单的内存存储（生产环境建议使用Redis或数据库）
class TaskStore {
  private tasks: Map<string, TaskResult> = new Map();
  private listeners: Map<string, ((result: TaskResult) => void)[]> = new Map();

  // 设置任务状态
  setTaskResult(taskId: string, result: TaskResult): void {
    console.log('📝 更新任务状态:', taskId, result.status);
    this.tasks.set(taskId, result);
    
    // 通知监听器
    const taskListeners = this.listeners.get(taskId);
    if (taskListeners) {
      taskListeners.forEach(listener => {
        try {
          listener(result);
        } catch (error) {
          console.error('❌ 监听器执行失败:', error);
        }
      });
      
      // 如果任务完成（成功或失败），清除监听器
      if (result.status === TaskStatus.SUCCESS || result.status === TaskStatus.FAILURE) {
        this.listeners.delete(taskId);
      }
    }
  }

  // 获取任务状态
  getTaskResult(taskId: string): TaskResult | null {
    return this.tasks.get(taskId) || null;
  }

  // 监听任务状态变化
  onTaskUpdate(taskId: string, callback: (result: TaskResult) => void): () => void {
    if (!this.listeners.has(taskId)) {
      this.listeners.set(taskId, []);
    }
    
    this.listeners.get(taskId)!.push(callback);
    
    // 如果任务已经有结果，立即调用回调
    const existingResult = this.getTaskResult(taskId);
    if (existingResult) {
      setTimeout(() => callback(existingResult), 0);
    }
    
    // 返回取消监听的函数
    return () => {
      const taskListeners = this.listeners.get(taskId);
      if (taskListeners) {
        const index = taskListeners.indexOf(callback);
        if (index > -1) {
          taskListeners.splice(index, 1);
        }
        
        if (taskListeners.length === 0) {
          this.listeners.delete(taskId);
        }
      }
    };
  }

  // 清理过期任务（可选，避免内存泄漏）
  cleanupExpiredTasks(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    const expiredTasks: string[] = [];
    
    this.tasks.forEach((result, taskId) => {
      // 假设任务创建时间存储在某个字段中，这里简化处理
      // 实际使用时建议添加创建时间字段
      expiredTasks.push(taskId);
    });
    
    // 清理逻辑可以根据实际需求调整
    console.log(`🧹 清理了${expiredTasks.length}个过期任务`);
  }

  // 获取所有任务（调试用）
  getAllTasks(): Map<string, TaskResult> {
    return new Map(this.tasks);
  }

  // 清空所有任务
  clear(): void {
    this.tasks.clear();
    this.listeners.clear();
    console.log('🗑️ 清空了所有任务状态');
  }
}

// 全局单例
export const taskStore = new TaskStore();

// 定期清理过期任务（可选）
if (typeof window !== 'undefined') {
  setInterval(() => {
    taskStore.cleanupExpiredTasks();
  }, 60 * 60 * 1000); // 每小时清理一次
} 