# Database Backup Strategy (PostgreSQL)

To ensure zero data loss in the RentEase SaaS platform, a robust backup strategy for the PostgreSQL database must be configured. 

## Automated Backups (Cron Job)

If you are running the database on a standard VM (e.g. AWS EC2, DigitalOcean Droplet), you should set up a cron job to dump the database and upload it to an S3-compatible storage bucket.

### 1. The Script (`backup.sh`)

Create a script on your database server to perform the dump:

```bash
#!/bin/bash

# Configuration
DB_URL="postgresql://user:password@localhost:5432/rentease"
S3_BUCKET="s3://rentease-backups/db"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
FILENAME="rentease_backup_${DATE}.sql.gz"

# Dump and compress
echo "Starting database backup..."
pg_dump $DB_URL | gzip > /tmp/$FILENAME

# Upload to S3 (assuming AWS CLI is configured)
echo "Uploading to S3..."
aws s3 cp /tmp/$FILENAME $S3_BUCKET/$FILENAME

# Clean up local file
rm /tmp/$FILENAME
echo "Backup complete: $FILENAME"
```

### 2. Cron Configuration

Make the script executable (`chmod +x backup.sh`) and add it to the cron tab (`crontab -e`) to run daily at 2:00 AM:

```cron
0 2 * * * /path/to/backup.sh >> /var/log/db_backup.log 2>&1
```

## Managed Database Backups (Recommended)

If you are using a managed database service (AWS RDS, Supabase, DigitalOcean Managed Databases), it is highly recommended to rely on their built-in Point-in-Time Recovery (PITR) and automated daily snapshots. 

- **AWS RDS**: Enable Automated Backups (retention period: 7-35 days).
- **Supabase**: PITR is available on Pro/Enterprise plans, allowing you to restore the database to any specific second in the past.

## Restoration Procedure

To restore a `.sql.gz` backup to a local or staging database:

```bash
# 1. Drop existing connections and database (CAUTION)
dropdb -U postgres rentease
createdb -U postgres rentease

# 2. Decompress and restore
gunzip -c rentease_backup_2026-09-11.sql.gz | psql -U postgres -d rentease
```
