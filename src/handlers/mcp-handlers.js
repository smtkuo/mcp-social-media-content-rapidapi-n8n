import { PLATFORMS, PUBLISHING_PLATFORMS } from '../constants/platforms.js';
import { EMOTIONS } from '../constants/emotions.js';

export class MCPHandlers {
  constructor(contentAPI, n8nPublisher) {
    this.contentAPI = contentAPI;
    this.n8nPublisher = n8nPublisher;
  }

  // Generate tools list for MCP
  generateToolsList() {
    const tools = [];

    // Add content generation tools
    Object.keys(PLATFORMS).forEach(platform => {
      tools.push({
        name: `generate_${platform.toLowerCase()}_content`,
        description: `Generate ${platform} content optimized for the platform. You can provide optional parameters or let AI detect them automatically.`,
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'The base text content to transform for social media'
            },
            language: {
              type: 'string',
              description: 'Target language code (en, tr, es, fr, de, etc.). If not provided, will be auto-detected.',
              enum: ['en', 'tr', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar']
            },
            emotion: {
              type: 'string',
              description: 'Desired emotional tone. If not provided, will be auto-detected.',
              enum: Object.keys(EMOTIONS)
            },
            length: {
              type: 'number',
              description: `Custom content length. If not provided, platform default (${PLATFORMS[platform].defaultLength}) will be used.`,
              minimum: 50,
              maximum: PLATFORMS[platform].maxLength
            }
          },
          required: ['text']
        }
      });
    });

    // Add analysis tools
    tools.push(
      {
        name: 'list_supported_platforms',
        description: 'List all supported social media platforms with their characteristics',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'list_available_emotions',
        description: 'List all available emotions/moods for content enhancement',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    );

    // Add publishing tools
    Object.keys(PUBLISHING_PLATFORMS).forEach(platform => {
      const platformInfo = PUBLISHING_PLATFORMS[platform];
      
      tools.push({
        name: `publish_${platform}_content`,
        description: `Publish content to ${platformInfo.name} via n8n webhook. ${platformInfo.requiresAuth ? 'Requires authentication setup in n8n workflow.' : ''}`,
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'Content to publish on the platform'
            },
            imageUrl: {
              type: 'string',
              description: 'Optional image URL to include with the content'
            },
            ...(platform === 'telegram' && {
              telegramChatId: {
                type: 'string',
                description: 'Telegram channel or chat ID (e.g., @channel or chat_id)'
              }
            })
          },
          required: platform === 'telegram' ? ['content', 'telegramChatId'] : ['content']
        }
      });
    });

    return tools;
  }

  // Handle tools/list request
  async handleToolsList() {
    console.error('Handling tools/list request');
    return { tools: this.generateToolsList() };
  }

  // Handle tools/call request
  async handleToolCall(name, args) {
    console.error(`Handling tool call: ${name}`);
    console.error(`MCP args received:`, args);
    
    // Handle content generation tools
    if (name.startsWith('generate_') && name.endsWith('_content')) {
      const platform = name.replace('generate_', '').replace('_content', '');
      const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
      
      console.error(`Generating content for platform: ${platformName}`);
      
      if (!PLATFORMS[platformName]) {
        throw new Error(`Unsupported platform: ${platformName}`);
      }

      const mcpOptions = {
        language: args.language,
        emotion: args.emotion,
        length: args.length
      };

      const result = await this.contentAPI.generateContent(
        platformName,
        args.text,
        mcpOptions
      );

      console.error(`Content generation result: ${result.success ? 'success' : 'failed'}`);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }

    // Handle publishing tools
    if (name.startsWith('publish_') && name.endsWith('_content')) {
      const platform = name.replace('publish_', '').replace('_content', '');
      
      console.error(`Publishing content to platform: ${platform}`);
      
      if (!PUBLISHING_PLATFORMS[platform]) {
        throw new Error(`Unsupported publishing platform: ${platform}`);
      }

      const options = {};
      if (args.imageUrl) {
        options.imageUrl = args.imageUrl;
      }
      if (args.telegramChatId) {
        options.telegramChatId = args.telegramChatId;
      }

      const result = await this.n8nPublisher.publishContent(
        platform,
        args.content,
        options
      );

      console.error(`Publishing result: ${result.success ? 'success' : 'failed'}`);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }

    // Handle other tools
    switch (name) {
      case 'list_supported_platforms':
        console.error('Listing supported platforms');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                contentPlatforms: Object.keys(PLATFORMS),
                publishingPlatforms: Object.keys(PUBLISHING_PLATFORMS),
                contentDetails: PLATFORMS,
                publishingDetails: PUBLISHING_PLATFORMS
              }, null, 2)
            }
          ]
        };

      case 'list_available_emotions':
        console.error('Listing available emotions');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                emotions: Object.keys(EMOTIONS),
                descriptions: EMOTIONS
              }, null, 2)
            }
          ]
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
} 