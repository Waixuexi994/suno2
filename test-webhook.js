// 测试webhook功能的脚本
// 运行方式: node test-webhook.js

const baseUrl = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000'; // 或你的本地端口

async function testWebhook() {
  console.log('🧪 开始测试webhook功能...');
  console.log('📍 基础URL:', baseUrl);

  try {
    // 1. 测试健康检查
    console.log('\n1️⃣ 测试健康检查...');
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthResponse.json();
    console.log('✅ 健康检查:', healthData);

    // 2. 测试音乐生成（带webhook）
    console.log('\n2️⃣ 测试音乐生成...');
    const generateResponse = await fetch(`${baseUrl}/api/generate-music`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: '一首轻快的流行歌曲',
        model: 'suno-v3.5',
        webhook_url: `${baseUrl}/api/webhook`
      })
    });

    if (!generateResponse.ok) {
      throw new Error(`生成请求失败: ${generateResponse.status}`);
    }

    const generateData = await generateResponse.json();
    console.log('✅ 音乐生成响应:', generateData);

    if (generateData.task_id) {
      // 3. 测试任务状态查询
      console.log('\n3️⃣ 测试任务状态查询...');
      const taskResponse = await fetch(`${baseUrl}/api/fetch-task?task_id=${generateData.task_id}`);
      const taskData = await taskResponse.json();
      console.log('✅ 任务状态:', taskData);

      // 4. 模拟webhook回调
      console.log('\n4️⃣ 模拟webhook回调...');
      const webhookResponse = await fetch(`${baseUrl}/api/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_id: generateData.task_id,
          status: 'SUCCESS',
          progress: '100%',
          data: [
            {
              id: 'test-track-1',
              title: '测试音乐',
              audio_url: 'https://example.com/test.mp3',
              image_url: 'https://example.com/test.jpg'
            }
          ]
        })
      });

      const webhookData = await webhookResponse.json();
      console.log('✅ Webhook回调:', webhookData);
    }

    console.log('\n🎉 所有测试通过！');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
testWebhook(); 