import { config } from 'dotenv';

// Load environment variables
config();

export const API_CONFIG = {
  baseURL: process.env.API_HOST || 'https://ai-social-media-content-generator-viral-content-creator.p.rapidapi.com',
  rapidAPIKey: process.env.RAPIDAPI_KEY,
};

export const N8N_CONFIG = {
  webhookURL: process.env.N8N_WEBHOOK_URL || ''
};

export const SERVER_CONFIG = {
  port: process.env.MCP_PORT || 5555,
  host: '127.0.0.1'
}; 