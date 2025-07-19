#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import { config } from 'dotenv';
import express from 'express';
import cors from 'cors';

// Load environment variables
config();

// API Configuration
const API_CONFIG = {
  baseURL: process.env.API_HOST || 'https://ai-social-media-content-generator-viral-content-creator.p.rapidapi.com',
  rapidAPIKey: process.env.RAPIDAPI_KEY,
};

// N8N Webhook Configuration
const N8N_CONFIG = {
  webhookURL: process.env.N8N_WEBHOOK_URL || ''
};

// Supported platforms with their characteristics
const PLATFORMS = {
  Instagram: { 
    defaultLength: 150, 
    style: 'visual-focused with hashtags and emojis',
    maxLength: 2200,
    endpoint: 'Instagram'
  },
  Twitter: { 
    defaultLength: 280, 
    style: 'concise and engaging with hashtags',
    maxLength: 280,
    endpoint: 'Twitter'
  },
  Linkedin: { 
    defaultLength: 1000, 
    style: 'professional and industry-focused',
    maxLength: 3000,
    endpoint: 'LinkedIn'
  },
  Facebook: { 
    defaultLength: 1000, 
    style: 'community-focused and engaging',
    maxLength: 63206,
    endpoint: 'Facebook'
  },
  TikTok: { 
    defaultLength: 100, 
    style: 'trending and viral with short expressions',
    maxLength: 2200,
    endpoint: 'TikTok'
  },
  Pinterest: { 
    defaultLength: 160, 
    style: 'descriptive and inspiring',
    maxLength: 500,
    endpoint: 'Pinterest'
  },
  YouTube: { 
    defaultLength: 200, 
    style: 'descriptive with call-to-action',
    maxLength: 5000,
    endpoint: 'YouTube'
  },
  Blog: { 
    defaultLength: 300, 
    style: 'SEO-optimized and informative',
    maxLength: 10000,
    endpoint: 'Blog'
  },
  Reddit: { 
    defaultLength: 150, 
    style: 'conversational and community-focused',
    maxLength: 40000,
    endpoint: 'Reddit'
  },
  Medium: { 
    defaultLength: 250, 
    style: 'in-depth analysis and insights',
    maxLength: 10000,
    endpoint: 'Medium'
  }
};

// Emotion descriptions for content enhancement
const EMOTIONS = {
  excited: 'energetic, enthusiastic, passionate',
  professional: 'formal, authoritative, trustworthy',
  friendly: 'warm, approachable, conversational',
  inspiring: 'motivational, uplifting, encouraging',
  informative: 'educational, clear, factual',
  humorous: 'funny, witty, entertaining',
  nostalgic: 'nostalgic, thoughtful, emotional',
  urgent: 'urgent, pressing, action-oriented',
  casual: 'relaxed, informal, laid-back',
  grateful: 'thankful, appreciative, heartfelt'
};

class SocialMediaContentAPI {
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

class N8nPublisher {
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

// Supported publishing platforms
const PUBLISHING_PLATFORMS = {
  x: { name: 'X (Twitter)', requiresAuth: true },
  facebook: { name: 'Facebook', requiresAuth: true },
  linkedin: { name: 'LinkedIn', requiresAuth: true },
  instagram: { name: 'Instagram', requiresAuth: true },
  telegram: { name: 'Telegram', requiresAuth: false, requiresChatId: true }
};

// Initialize API clients
const contentAPI = new SocialMediaContentAPI(API_CONFIG);
const n8nPublisher = new N8nPublisher(N8N_CONFIG);

// Create MCP server
const server = new Server(
  {
    name: 'social-media-content-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Add debug logging
console.error('MCP Server initializing...');

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  try {
    console.error('Handling tools/list request');
    const tools = [];

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

    // Add publishing tools for each platform
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



    console.error(`Returning ${tools.length} tools`);
    return { tools };
  } catch (error) {
    console.error('Error in tools/list handler:', error);
    throw error;
  }
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    console.error(`Handling tool call: ${name}`);
    console.error(`MCP args received:`, args);
    
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

      const result = await contentAPI.generateContent(
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

      const result = await n8nPublisher.publishContent(
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

  } catch (error) {
    console.error(`Error in tool call ${name}:`, error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`
        }
      ],
      isError: true
    };
  }
});

// Start MCP server with proper error handling
async function main() {
  const mcpMode = process.env.MCP_MODE || 'stdio';
  const port = process.env.MCP_PORT || 5555;
  
  try {
    if (mcpMode === 'http') {
      console.error(`Starting MCP server in HTTP mode on port ${port}...`);
      
      const app = express();
      app.use(cors());
      app.use(express.json({ limit: '10mb' }));
      app.use(express.urlencoded({ extended: true }));
      
      // Simple JSON-RPC handler for mcp-remote compatibility
      async function handleJsonRpc(req, res) {
        try {
          const { method, params, id } = req.body;
          
          console.error(`Handling JSON-RPC method: ${method}`);
          
          // Handle MCP initialize method
          if (method === 'initialize') {
            return res.json({
              jsonrpc: '2.0',
              result: {
                protocolVersion: '2024-11-05',
                capabilities: {
                  tools: {
                    listChanged: false
                  },
                  resources: {
                    listChanged: false
                  },
                  prompts: {
                    listChanged: false
                  },
                  experimental: {}
                },
                serverInfo: {
                  name: 'social-media-content-mcp-server',
                  version: '1.0.0'
                }
              },
              id
            });
          }
          
          // Handle MCP notifications (these don't need responses)
          if (method === 'notifications/initialized') {
            return res.json({
              jsonrpc: '2.0',
              result: {},
              id
            });
          }
          
          if (method === 'resources/list') {
            return res.json({
              jsonrpc: '2.0',
              result: {
                resources: []
              },
              id
            });
          }
          
          if (method === 'prompts/list') {
            return res.json({
              jsonrpc: '2.0',
              result: {
                prompts: []
              },
              id
            });
          }
          
          if (method === 'tools/list') {
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



            return res.json({
              jsonrpc: '2.0',
              result: { tools },
              id
            });
          }
          
          if (method === 'tools/call') {
            const { name, arguments: args } = params;
            
            // Handle content generation tools
            if (name.startsWith('generate_') && name.endsWith('_content')) {
              const platform = name.replace('generate_', '').replace('_content', '');
              const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
              
              if (!PLATFORMS[platformName]) {
                throw new Error(`Unsupported platform: ${platformName}`);
              }

              const mcpOptions = {
                language: args.language,
                emotion: args.emotion,
                length: args.length
              };

              const result = await contentAPI.generateContent(
                platformName,
                args.text,
                mcpOptions
              );

              return res.json({
                jsonrpc: '2.0',
                result: {
                  content: [{
                    type: 'text',
                    text: JSON.stringify(result, null, 2)
                  }]
                },
                id
              });
            }

            // Handle publishing tools
            if (name.startsWith('publish_') && name.endsWith('_content')) {
              const platform = name.replace('publish_', '').replace('_content', '');
              
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

              const result = await n8nPublisher.publishContent(
                platform,
                args.content,
                options
              );

              return res.json({
                jsonrpc: '2.0',
                result: {
                  content: [{
                    type: 'text',
                    text: JSON.stringify(result, null, 2)
                  }]
                },
                id
              });
            }
            
            // Handle other tools
            switch (name) {
              case 'list_supported_platforms':
                return res.json({
                  jsonrpc: '2.0',
                  result: {
                    content: [{
                      type: 'text',
                      text: JSON.stringify({
                        contentPlatforms: Object.keys(PLATFORMS),
                        publishingPlatforms: Object.keys(PUBLISHING_PLATFORMS),
                        contentDetails: PLATFORMS,
                        publishingDetails: PUBLISHING_PLATFORMS
                      }, null, 2)
                    }]
                  },
                  id
                });

              case 'list_available_emotions':
                return res.json({
                  jsonrpc: '2.0',
                  result: {
                    content: [{
                      type: 'text',
                      text: JSON.stringify({
                        emotions: Object.keys(EMOTIONS),
                        descriptions: EMOTIONS
                      }, null, 2)
                    }]
                  },
                  id
                });

              default:
                throw new Error(`Unknown tool: ${name}`);
            }
          }
          
          throw new Error(`Unknown method: ${method}`);
          
        } catch (error) {
          console.error('JSON-RPC error:', error);
          res.json({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: error.message
            },
            id: req.body.id || null
          });
        }
      }
      
      // Health endpoint
      app.get('/health', (req, res) => {
        res.json({ 
          status: 'ok', 
          contentPlatforms: Object.keys(PLATFORMS),
          publishingPlatforms: Object.keys(PUBLISHING_PLATFORMS),
          n8nWebhook: N8N_CONFIG.webhookURL,
          mode: 'http-mcp-remote',
          mcpEndpoint: '/mcp'
        });
      });
      
      // MCP endpoint for mcp-remote
      app.post('/mcp', handleJsonRpc);
      
      // GET endpoint (returns 405 as this is POST-only for JSON-RPC)
      app.get('/mcp', (req, res) => {
        res.status(405).set('Allow', 'POST').send('Method Not Allowed - Use POST for JSON-RPC requests');
      });
      
      const httpServer = app.listen(port, '127.0.0.1', () => {
        console.error('Social Media Content MCP Server started successfully');
        console.error(`Available content platforms: ${Object.keys(PLATFORMS).join(', ')}`);
        console.error(`Available publishing platforms: ${Object.keys(PUBLISHING_PLATFORMS).join(', ')}`);
        console.error(`N8N webhook URL: ${N8N_CONFIG.webhookURL}`);
        console.error(`HTTP Server running on http://127.0.0.1:${port}`);
        console.error(`MCP endpoint: http://127.0.0.1:${port}/mcp`);
        console.error(`Health check: http://127.0.0.1:${port}/health`);
        console.error(`Mode: HTTP with mcp-remote compatibility`);
        console.error('Server ready for MCP connections...');
      });
      
      process.on('SIGINT', async () => {
        console.error('Received SIGINT, shutting down gracefully...');
        try {
          httpServer.close();
          await server.close();
        } catch (err) {
          console.error('Error closing server:', err);
        }
        process.exit(0);
      });
      
      process.on('SIGTERM', async () => {
        console.error('Received SIGTERM, shutting down gracefully...');
        try {
          httpServer.close();
          await server.close();
        } catch (err) {
          console.error('Error closing server:', err);
        }
        process.exit(0);
      });
      
    } else {
      console.error('Starting MCP server in stdio mode...');
      console.error('Creating stdio transport...');
      
      const transport = new StdioServerTransport();
      
      console.error('Connecting server to transport...');
      await server.connect(transport);
      
      console.error('Social Media Content MCP Server started successfully');
      console.error(`Available content platforms: ${Object.keys(PLATFORMS).join(', ')}`);
      console.error(`Available publishing platforms: ${Object.keys(PUBLISHING_PLATFORMS).join(', ')}`);
      console.error(`N8N webhook URL: ${N8N_CONFIG.webhookURL}`);
      console.error('Server ready for MCP connections...');
      
      setInterval(() => {
        // Keep alive
      }, 30000);
      
      process.on('SIGINT', async () => {
        console.error('Received SIGINT, shutting down gracefully...');
        try {
          await server.close();
        } catch (err) {
          console.error('Error closing server:', err);
        }
        process.exit(0);
      });
      
      process.on('SIGTERM', async () => {
        console.error('Received SIGTERM, shutting down gracefully...');
        try {
          await server.close();
        } catch (err) {
          console.error('Error closing server:', err);
        }
        process.exit(0);
      });
    }
    
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

main();