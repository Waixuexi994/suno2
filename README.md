# HarmonyAI - AI音乐生成平台

一个基于React + TypeScript + Vite构建的AI音乐生成平台，支持Suno AI API。

## 功能特点

- 🎵 AI音乐生成：使用Suno AI API生成高质量音乐
- 🎨 现代化UI：基于Tailwind CSS的响应式设计
- 🌐 多语言支持：中英文切换
- 🎯 智能进度显示：实时显示音乐生成进度
- 🔄 Webhook支持：适用于Vercel等平台的长时间任务处理
- 📱 响应式设计：支持移动端和桌面端

## 技术栈

- **前端**: React 18 + TypeScript + Vite
- **样式**: Tailwind CSS
- **图标**: Lucide React
- **API**: Suno AI API
- **部署**: Vercel (支持webhook)

## 本地开发

### 环境要求

- Node.js 16+
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:5173` 查看应用。

### 构建生产版本

```bash
npm run build
```

## Vercel部署

### 1. 部署到Vercel

```bash
# 安装Vercel CLI
npm install -g vercel

# 部署
vercel --prod
```

### 2. 环境变量设置

在Vercel控制台设置以下环境变量：

```
SUNO_API_KEY=your_suno_api_key_here
```

### 3. Webhook配置

项目自动支持webhook模式，在Vercel环境中会自动检测并使用webhook处理长时间任务。

## API端点

### 生成音乐
- **POST** `/api/generate-music`
- **Body**: 
  ```json
  {
    "prompt": "音乐描述",
    "model": "suno-v3.5",
    "webhook_url": "https://your-domain.vercel.app/api/webhook"
  }
  ```

### 查询任务状态
- **GET** `/api/fetch-task?task_id=your_task_id`

### Webhook回调
- **POST** `/api/webhook`
- **Body**: 
  ```json
  {
    "task_id": "任务ID",
    "status": "SUCCESS|FAILURE|PROCESSING",
    "data": [...],
    "fail_reason": "失败原因"
  }
  ```

### 健康检查
- **GET** `/api/health`

## 工作模式

### 开发环境
- 使用轮询模式检查任务状态
- 支持长时间任务（最多20分钟）

### Vercel环境
- 自动检测并使用webhook模式
- 避免函数执行时间限制
- 支持异步任务处理

## 配置文件

### vercel.json
```json
{
  "functions": {
    "api/*.ts": {
      "maxDuration": 60
    }
  },
  "env": {
    "SUNO_API_KEY": "your_api_key"
  }
}
```

## 使用说明

1. **输入音乐描述**: 在文本框中输入想要生成的音乐风格和内容
2. **点击生成**: 系统会自动检测环境并选择合适的处理模式
3. **等待完成**: 
   - 开发环境：实时显示进度条
   - Vercel环境：通过webhook异步处理
4. **播放音乐**: 生成完成后可以直接播放和下载

## 故障排除

### 常见问题

1. **音乐生成失败**
   - 检查API密钥是否正确
   - 确认账户余额充足
   - 检查网络连接

2. **Webhook不工作**
   - 确认Vercel环境变量设置正确
   - 检查webhook URL是否可访问
   - 查看Vercel函数日志

3. **长时间无响应**
   - Vercel环境会自动使用webhook模式
   - 开发环境可能需要等待更长时间

### 调试技巧

- 使用"诊断"按钮检查API状态
- 查看浏览器控制台日志
- 检查Vercel函数日志

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！

## 联系方式

如有问题请联系技术支持。 