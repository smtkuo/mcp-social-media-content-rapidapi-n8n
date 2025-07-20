import axios from 'axios';
import { PLATFORMS } from '../constants/platforms.js';

export class SocialMediaContentAPI {
  constructor(config) {
    this.baseURL = config.baseURL;
    this.rapidAPIKey = config.rapidAPIKey;
  }

  async generateContent(platform, text, mcpOptions = {}) {
    console.error(`Starting content generation for ${platform}`);
    
    try {
      const platformConfig = PLATFORMS[platform];
      if (!platformConfig) {
        throw new Error(`Unsupported platform: ${platform}`);
      }

      const {
        language = 'en',
        emotion = 'friendly',
        length = platformConfig.defaultLength,
        sentiment = 'neutral'
      } = mcpOptions;

      console.error('Using MCP options:', mcpOptions);

      // Format text with additional parameters since API only accepts text, lang, length
      const enhancedText = `Content: ${text}\n\nStyle: ${platformConfig.style}\nEmotion: ${emotion}\nSentiment: ${sentiment}`;

      const requestData = {
        text: enhancedText,
        lang: language,
        length: length
      };

      const headers = {
        'Content-Type': 'application/json'
      };

      // RapidAPI headers
      if (this.rapidAPIKey) {
        headers['x-rapidapi-key'] = this.rapidAPIKey;
      }

      console.error(`Calling social media API with data:`, requestData, platform);

      const apiEndpoint = platformConfig.endpoint || platform;
      const response = await axios.post(
        `${this.baseURL}/${apiEndpoint}?noqueue=1`,
        requestData,
        {
          headers,
          timeout: 30000
        }
      );

      return {
        success: true,
        platform,
        content: response.data,
        originalText: text,
        requestParameters: {
          language,
          emotion,
          length,
          sentiment,
          style: platformConfig.style
        },
        mcpOptions: mcpOptions
      };

    } catch (error) {
      console.error(`Error generating content for ${platform}:`, error.message);
      
      return {
        success: false,
        error: error.message,
        platform,
        originalText: text,
        requestParameters: mcpOptions
      };
    }
  }
} 