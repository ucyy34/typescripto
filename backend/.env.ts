# TypeScript Sandbox Environment
# MUST be loaded via `dotenv -e .env.ts`

# 1. Safety Tag (Required by bootstrap.ts)
ENV_TAG=dev

# 2. Server Config
PORT=3100
NODE_ENV=development

# 3. Database Config (Targeting Local Dev DB)
# WARNING: Do NOT put production credentials here!
# DB_NAME MUST end with "_dev" or bootstrap will fail
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dosttan_dev
DB_USER=postgres
DB_PASSWORD=medusa123

# 4. Other Secrets (Dev values)
JWT_SECRET=dev_secret_key_12345
JWT_EXPIRES_IN=1d
REFRESH_TOKEN_SECRET=dev_refresh_secret_12345
REFRESH_TOKEN_EXPIRES_IN=7d

# 5. Redis (Optional/Local)
REDIS_URL=redis://localhost:6379

# 6. Client URL (for CORS)
CLIENT_URL=http://localhost:5500
