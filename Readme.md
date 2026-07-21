# 🚀 ExaminAI Platform Boilerplate

Welcome to the start of the ExaminAI Platform codebase. This repository contains the local orchestrating configs (Docker Compose) and repository structures.

## 🐳 Docker Setup

This project uses Docker to coordinate local Postgres, Redis, and MinIO instances.

### 1. Configure Local Environment
Copy the environment template file:
```bash
# In PowerShell:
Copy-Item .env.example .env

# In standard Bash/Git Bash:
cp .env.example .env
```
Open the `.env` file and adjust your database password or access credentials as desired.

### 2. Start Services
Ensure you have [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running on your machine.
Run the following command to download and start the containers in background mode:
```bash
docker compose up -d
```

Check the health of the services:
```bash
docker compose ps
```

*   **Database (Postgres)**: accessible locally at `localhost:5432`
*   **Cache/Queue (Redis)**: accessible locally at `localhost:6379`
*   **Object Storage (MinIO Console Dashboard)**: accessible via web browser at `http://localhost:9001` (user: `minioadmin`, password: `minioadmin_secret`)

### 3. Stop Services
To stop services without losing your local database records:
```bash
docker compose down
```
To destroy all containers and wipe databases completely:
```bash
docker compose down -v
```

---

## 🐙 Git & GitHub Setup

Follow this sequence to track your project in Git and push it to GitHub:

### 1. Initialize repository
Initialize the main branch locally:
```bash
git init -b main
```

### 2. Make your first commit
Add all configurations and initial structures to staging:
```bash
git add .
git commit -m "chore: initial project layout with docker compose and environmental variables"
```

### 3. Link remote repository
Go to GitHub, create a repository (e.g. `ExaminAI`), and add it as remote:
```bash
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
```

### 4. Setup development branch and push
Create the integration branch:
```bash
git checkout -b dev
git push -u origin main
git push -u origin dev
```
All feature branches should be created off of `dev`.
