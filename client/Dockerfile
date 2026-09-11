FROM node:22-alpine

WORKDIR /usr/src/app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Run Vite in host mode so it is accessible outside container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
