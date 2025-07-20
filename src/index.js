#!/usr/bin/env node

import { API_CONFIG, N8N_CONFIG, SERVER_CONFIG } from './config/index.js';
import { SocialMediaContentAPI } from './services/social-media-api.js';
import { N8nPublisher } from './services/n8n-publisher.js';
import { MCPHandlers } from './handlers/mcp-handlers.js';
import { createMCPServer } from './server/mcp-server.js';
import { createExpressServer } from './server/express-server.js';
import { PLATFORMS, PUBLISHING_PLATFORMS } from './constants/platforms.js';

// Initialize API clients
const contentAPI = new SocialMediaContentAPI(API_CONFIG);
const n8nPublisher = new N8nPublisher(N8N_CONFIG);

// Initialize MCP handlers
const mcpHandlers = new MCPHandlers(contentAPI, n8nPublisher);

// Create MCP server
const server = createMCPServer(mcpHandlers);

// Start server with proper error handling
async function main() {
  try {
    console.error(`Starting MCP server in HTTP mode on port ${SERVER_CONFIG.port}...`);
    
    // Create Express app
    const app = createExpressServer(mcpHandlers, server);
    
    const httpServer = app.listen(SERVER_CONFIG.port, SERVER_CONFIG.host, () => {
      console.error('Social Media Content MCP Server started successfully');
      console.error(`Available content platforms: ${Object.keys(PLATFORMS).join(', ')}`);
      console.error(`Available publishing platforms: ${Object.keys(PUBLISHING_PLATFORMS).join(', ')}`);
      console.error(`N8N webhook URL: ${N8N_CONFIG.webhookURL}`);
      console.error(`HTTP Server running on http://${SERVER_CONFIG.host}:${SERVER_CONFIG.port}`);
      console.error(`MCP endpoint: http://${SERVER_CONFIG.host}:${SERVER_CONFIG.port}/mcp`);
      console.error(`Health check: http://${SERVER_CONFIG.host}:${SERVER_CONFIG.port}/health`);
      console.error(`Mode: HTTP with mcp-remote compatibility`);
      console.error('Server ready for MCP connections...');
    });
    
    // Graceful shutdown handlers
    const gracefulShutdown = async (signal) => {
      console.error(`Received ${signal}, shutting down gracefully...`);
      try {
        httpServer.close();
        await server.close();
      } catch (err) {
        console.error('Error closing server:', err);
      }
      process.exit(0);
    };
    
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the application
main(); 