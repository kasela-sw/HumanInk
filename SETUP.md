# Server Setup Instructions

## Environment Variables

Create a `.env` file in the server directory with the following variables:

```
OPENAI_API_KEY=your_openai_api_key_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
PORT=5000
```

## Getting Your API Keys

### OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign in to your OpenAI account
3. Click "Create new secret key"
4. Copy the key and add it to your `.env` file

### Supabase Keys

1. Go to your Supabase project dashboard
2. Navigate to **Settings** > **API**
3. Copy the **Project URL** and add it as `SUPABASE_URL`
4. Copy the **service_role** key (not the anon key) and add it as `SUPABASE_SERVICE_ROLE_KEY`

## Running the Server

```bash
cd server
npm install
npm run dev
```

The server will run on http://localhost:5000
