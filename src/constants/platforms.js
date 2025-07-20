// Supported platforms with their characteristics
export const PLATFORMS = {
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

// Supported publishing platforms
export const PUBLISHING_PLATFORMS = {
  x: { name: 'X (Twitter)', requiresAuth: true },
  facebook: { name: 'Facebook', requiresAuth: true },
  linkedin: { name: 'LinkedIn', requiresAuth: true },
  instagram: { name: 'Instagram', requiresAuth: true },
  telegram: { name: 'Telegram', requiresAuth: false, requiresChatId: true }
}; 