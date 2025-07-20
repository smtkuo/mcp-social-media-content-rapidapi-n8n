import axios from 'axios';

export class N8nPublisher {
  constructor(config) {
    this.webhookURL = config.webhookURL;
  }

  async publishContent(platform, content, options = {}) {
    console.error(`Publishing content to ${platform} via n8n webhook`);
    
    try {
      const payload = {
        platform: platform.toLowerCase(),
        content: content
      };

      // Add optional parameters
      if (options.imageUrl) {
        payload.imageUrl = options.imageUrl;
      }
      
      if (platform.toLowerCase() === 'telegram' && options.telegramChatId) {
        payload.telegramChatId = options.telegramChatId;
      }

      console.error(`Sending payload to n8n webhook:`, payload);

      const response = await axios.post(this.webhookURL, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      return {
        success: true,
        platform,
        content,
        response: response.data,
        webhookURL: this.webhookURL,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`Error publishing to ${platform} via n8n:`, error.message);
      
      return {
        success: false,
        error: error.message,
        platform,
        content,
        webhookURL: this.webhookURL,
        timestamp: new Date().toISOString()
      };
    }
  }
} 