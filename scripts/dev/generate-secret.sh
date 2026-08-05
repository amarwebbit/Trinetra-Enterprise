#!/bin/bash

# Generate secure secrets for environment variables
# Usage: ./scripts/dev/generate-secret.sh

echo "🔐 Generating secure secrets..."

# Generate NEXTAUTH_SECRET
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)"
echo ""

# Generate JWT_SECRET (if needed)
echo "JWT_SECRET=$(openssl rand -base64 32)"
echo ""

# Generate ENCRYPTION_KEY (if needed)
echo "ENCRYPTION_KEY=$(openssl rand -hex 32)"
echo ""

# Generate API_KEY (if needed)
echo "API_KEY=$(openssl rand -base64 32)"
echo ""

echo "✅ Secrets generated successfully!"
echo "Copy these values to your .env file"
