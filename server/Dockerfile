FROM node:22-alpine

WORKDIR /usr/src/app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy package descriptors and prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (including devDependencies for build and prisma CLI)
RUN npm install --legacy-peer-deps

# Generate Prisma Client
RUN npx prisma generate

# Copy application source code
COPY . .

# Build the NestJS application
RUN npm run build

# Expose port
EXPOSE 3000

# Start script: push schema to Postgres, run seed, and launch server
CMD ["sh", "-c", "npx prisma db push --skip-generate && (npx tsx prisma/seed.ts || true) && node dist/main.js"]
