/**
 * Environment Variable Validator
 * Ensures all required environment variables are present on startup
 * 
 * Usage:
 *   import { validateEnvironment } from '@/lib/env-validator';
 *   const { valid, errors, warnings } = validateEnvironment();
 */

interface EnvValidationRule {
  key: string;
  required: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  message?: string;
  allowedValues?: string[];
  defaultWarning?: string;
}

const validationRules: EnvValidationRule[] = [
  // ============================================
  // CRITICAL: Required for application to run
  // ============================================
  { 
    key: 'DATABASE_URL', 
    required: true, 
    message: 'PostgreSQL connection string is required.\n' +
              'Example: postgresql://user:password@localhost:5432/dbname' 
  },
  { 
    key: 'NEXTAUTH_SECRET', 
    required: true, 
    minLength: 32, 
    message: 'NEXTAUTH_SECRET must be at least 32 characters.\n' +
             'Generate using: openssl rand -base64 32' 
  },
  { 
    key: 'NEXTAUTH_URL', 
    required: true, 
    message: 'NEXTAUTH_URL is required.\n' +
             'Development: http://localhost:3000\n' +
             'Production: https://your-domain.com' 
  },
  
  // ============================================
  // OPTIONAL but recommended for full functionality
  // ============================================
  { 
    key: 'REDIS_URL', 
    required: false,
    message: 'REDIS_URL is recommended for caching. Redis will use in-memory fallback if not set.',
    defaultWarning: 'Redis not configured - using in-memory cache (not suitable for production)'
  },
  { 
    key: 'UPSTASH_REDIS_REST_URL', 
    required: false,
    message: 'Upstash Redis URL (alternative to REDIS_URL)'
  },
  { 
    key: 'UPSTASH_REDIS_REST_TOKEN', 
    required: false,
    message: 'Upstash Redis Token (alternative to REDIS_URL)'
  },
  
  // Email (if using Resend)
  { 
    key: 'RESEND_API_KEY', 
    required: false,
    message: 'Resend API key for email notifications'
  },
  { 
    key: 'EMAIL_FROM', 
    required: false,
    message: 'Email sender address (e.g., noreply@examin.ai)'
  },
  
  // SMS (if using Twilio)
  { 
    key: 'TWILIO_ACCOUNT_SID', 
    required: false,
    message: 'Twilio Account SID for SMS/WhatsApp'
  },
  { 
    key: 'TWILIO_AUTH_TOKEN', 
    required: false,
    message: 'Twilio Auth Token for SMS/WhatsApp'
  },
  { 
    key: 'TWILIO_WHATSAPP_NUMBER', 
    required: false,
    message: 'Twilio WhatsApp number for WhatsApp notifications'
  },
  
  // AI (OpenAI)
  { 
    key: 'OPENAI_API_KEY', 
    required: false,
    message: 'OpenAI API key for AI question generation and evaluation'
  },
  
  // Code Execution (Judge0)
  { 
    key: 'JUDGE0_API_URL', 
    required: false,
    message: 'Judge0 API URL for code execution (default: http://localhost:2358)'
  },
  { 
    key: 'JUDGE0_API_KEY', 
    required: false,
    message: 'Judge0 API Key (optional)'
  },
  
  // Storage (MinIO)
  { 
    key: 'MINIO_ENDPOINT', 
    required: false,
    message: 'MinIO endpoint for file storage'
  },
  { 
    key: 'MINIO_ACCESS_KEY', 
    required: false,
    message: 'MinIO access key'
  },
  { 
    key: 'MINIO_SECRET_KEY', 
    required: false,
    message: 'MinIO secret key'
  },
  { 
    key: 'MINIO_BUCKET', 
    required: false,
    message: 'MinIO bucket name (default: exam-files)'
  },
  
  // Monitoring
  { 
    key: 'SENTRY_DSN', 
    required: false,
    message: 'Sentry DSN for error tracking'
  },
];

export function validateEnvironment(): { 
  valid: boolean; 
  errors: string[]; 
  warnings: string[];
  summary: string;
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  console.log('🔍 Validating environment variables...');

  for (const rule of validationRules) {
    const value = process.env[rule.key];
    
    if (rule.required) {
      if (!value) {
        errors.push(`❌ ${rule.key}: ${rule.message || 'Required variable is missing'}`);
        continue;
      }
      
      if (rule.minLength && value.length < rule.minLength) {
        errors.push(`❌ ${rule.key}: ${rule.message || `Must be at least ${rule.minLength} characters`}`);
      }
      
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push(`❌ ${rule.key}: ${rule.message || `Must be at most ${rule.maxLength} characters`}`);
      }
      
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push(`❌ ${rule.key}: ${rule.message || 'Does not match required pattern'}`);
      }
    }
    
    // Check for common development values in production
    if (process.env.NODE_ENV === 'production') {
      if (rule.key === 'NEXTAUTH_SECRET' && value?.includes('your-super')) {
        errors.push('❌ NEXTAUTH_SECRET is using a default/example value in production!');
      }
      if (rule.key === 'DATABASE_URL' && value?.includes('localhost')) {
        warnings.push(`⚠️ ${rule.key}: Database URL points to localhost in production - verify this is intentional`);
      }
    }
    
    // Provide warnings for optional but recommended variables
    if (!value && rule.defaultWarning) {
      warnings.push(`⚠️ ${rule.key}: ${rule.defaultWarning}`);
    }
  }

  // Check if Redis is configured (either REDIS_URL or Upstash)
  const hasRedis = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
  if (!hasRedis && process.env.NODE_ENV === 'production') {
    warnings.push('⚠️ Redis not configured - caching will use in-memory fallback. This may cause performance issues in production.');
  }

  const valid = errors.length === 0;
  
  const summary = valid 
    ? '✅ All environment variables validated successfully'
    : `❌ ${errors.length} error(s) found in environment variables`;

  // Log results
  console.log('📊 Environment Validation Results:');
  console.log(`  ${summary}`);
  if (warnings.length > 0) {
    console.log('  ⚠️ Warnings:');
    warnings.forEach(w => console.log(`    ${w}`));
  }
  if (errors.length > 0) {
    console.log('  ❌ Errors:');
    errors.forEach(e => console.log(`    ${e}`));
  }

  return { valid, errors, warnings, summary };
}

// Auto-validate on import in production (excluding build phase)
if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build' && process.env.npm_lifecycle_event !== 'build') {
  const result = validateEnvironment();
  if (!result.valid) {
    console.error('\n❌ Environment validation failed. Application cannot start.\n');
    console.error('Please fix the following issues:');
    result.errors.forEach(err => console.error(`  ${err}`));
    console.error('\nRefer to .env.example for required variables.\n');
    process.exit(1);
  }
}

// Helper to get typed environment variables
export function getEnv(key: string, fallback?: string): string {
  const value = process.env[key];
  if (!value && fallback === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || fallback!;
}

// Helper to get boolean environment variables
export function getEnvBoolean(key: string, fallback: boolean = false): boolean {
  const value = process.env[key];
  if (value === undefined) return fallback;
  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
}

// Helper to get number environment variables
export function getEnvNumber(key: string, fallback?: number): number {
  const value = process.env[key];
  if (!value) {
    if (fallback === undefined) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return fallback;
  }
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    throw new Error(`Invalid number for environment variable: ${key} = "${value}"`);
  }
  return num;
}
