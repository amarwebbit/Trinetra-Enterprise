#!/bin/bash

# Project Setup Script
# Usage: ./scripts/dev/setup.sh

set -e

echo "🚀 Setting up ExaminAI Project..."

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ is required. Current version: $(node -v)"
    exit 1
fi
echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing npm dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️ Please update .env with your configuration values"
fi

# Generate Prisma client
echo "🔄 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🗄️ Running database migrations..."
npx prisma db push

# Seed database (if seed script exists)
if [ -f "./scripts/db/seed.sh" ]; then
    echo "🌱 Seeding database..."
    ./scripts/db/seed.sh
fi

echo "✅ Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Update .env with your configuration"
echo "2. Run: npm run dev"
echo "3. Open: http://localhost:3000"
