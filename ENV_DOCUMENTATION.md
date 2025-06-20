# Environment Variables Documentation

## Required Environment Variables for StudioGen

Copy and paste the following environment variables to your `.env` file:

```bash
# Google Generative AI API Key (Required)
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key_here

# Next.js Configuration
NEXT_PUBLIC_APP_URL=http://localhost:9002
NODE_ENV=production

# Optional: For production deployment
PORT=9002
HOST=0.0.0.0
```

## How to obtain GOOGLE_GENERATIVE_AI_API_KEY:

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key
5. Replace `your_google_ai_api_key_here` with your actual API key

## Important Notes:

- Keep your API key secure and never commit it to version control
- The API key is required for image generation functionality
- Without the API key, the application will start but image generation will fail
