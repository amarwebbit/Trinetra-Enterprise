#!/bin/bash

echo "🔐 Generating Strong Credentials for ExaminAI"
echo "=============================================="
echo ""

echo "1. Database Password (PostgreSQL):"
DB_PASS=$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)
echo "   DB_PASSWORD=$DB_PASS"
echo ""

echo "2. NextAuth Secret (32+ characters):"
NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo "   NEXTAUTH_SECRET=$NEXTAUTH_SECRET"
echo ""

echo "3. JWT Secret:"
JWT_SECRET=$(openssl rand -base64 32)
echo "   JWT_SECRET=$JWT_SECRET"
echo ""

echo "4. Encryption Key (64 hex chars):"
ENCRYPTION_KEY=$(openssl rand -hex 32)
echo "   ENCRYPTION_KEY=$ENCRYPTION_KEY"
echo ""

echo "5. Admin User Password:"
ADMIN_PASS=$(openssl rand -base64 12)
echo "   ADMIN_PASSWORD=$ADMIN_PASS"
echo ""

echo "=============================================="
echo "✅ Credentials generated successfully!"
echo "⚠️  Save these securely in a password manager"
echo "⚠️  Never commit .env to git"
