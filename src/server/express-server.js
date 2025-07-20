import express from 'express';
import cors from 'cors';
import { PLATFORMS, PUBLISHING_PLATFORMS } from '../constants/platforms.js';
import { EMOTIONS } from '../constants/emotions.js';
import { N8N_CONFIG } from '../config/index.js';

export function createExpressServer(mcpHandlers, server) {
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
        const tools = mcpHandlers.generateToolsList();
        return res.json({
          jsonrpc: '2.0',
          result: { tools },
          id
        });
      }
      
      if (method === 'tools/call') {
        const { name, arguments: args } = params;
        const result = await mcpHandlers.handleToolCall(name, args);
        
        return res.json({
          jsonrpc: '2.0',
          result: result,
          id
        });
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

  return app;
} 