# Scripts Directory

This directory contains utility scripts for development, deployment, and maintenance.

## 📁 Directory Structure

### Database Scripts (`db/`)
- `backup.sh` - Create database backup with timestamp
- `restore.sh` - Restore database from backup file
- `migrate.sh` - Run database migrations
- `seed.sh` - Seed development database with sample data
- `reset.sh` - Reset database (drop and recreate)

### Deployment Scripts (`deploy/`)
- `staging.sh` - Deploy to staging environment
- `production.sh` - Deploy to production environment
- `docker-build.sh` - Build Docker images
- `docker-push.sh` - Push Docker images to registry

### Development Scripts (`dev/`)
- `setup.sh` - Initial project setup (install deps, setup env)
- `clean.sh` - Clean build artifacts and caches
- `test.sh` - Run tests with coverage
- `generate-secret.sh` - Generate secure random secrets

### Maintenance Scripts (`maintenance/`)
- `health-check.sh` - Check all service health
- `cleanup-logs.sh` - Clean old log files
- `update-deps.sh` - Update dependencies safely
- `ssl-renew.sh` - Renew SSL certificates

### Security Scripts (`security/`)
- `audit.sh` - Run security audit
- `scan.sh` - Run vulnerability scan
- `update-secrets.sh` - Rotate secrets

## Usage

All scripts are executable and can be run from the project root:

```bash
# Example: Run database backup
./scripts/db/backup.sh

# Example: Run tests
./scripts/dev/test.sh

# Example: Deploy to staging
./scripts/deploy/staging.sh
```
