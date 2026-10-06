# n8n starter workflows

These workflows are custom starter templates for this project. They are not copied from a paid library.

Import the JSON files into n8n and provide environment variables/credentials before activation.

Required for Abu Khaled workflows:
- SUPABASE_URL
- SUPABASE_PUBLISHABLE_KEY
- AUTOMATION_WEBHOOK_KEY

Required for Telegram notifications:
- TELEGRAM_BOT_TOKEN
- TELEGRAM_CHAT_ID

Start with 01 manually. Only enable 02 and 04 after the database migration and Edge Function are live. Configure the Telegram webhook to point to workflow 03 only after the n8n URL is stable. Configure a GitHub workflow_run webhook for 05 if build alerts are wanted.

Never put SUPABASE_SERVICE_ROLE_KEY in a browser-facing workflow or public repository.
