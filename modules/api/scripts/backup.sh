#!/bin/bash
# Database Backup Script for AlphaPro
# Automated PostgreSQL backup with rotation
# Run via cron: 0 2 * * * /path/to/backup.sh

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
DATABASE_URL="${DATABASE_URL:-postgresql://alphapro:password@localhost:5432/alphapro}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
S3_BUCKET="${S3_BUCKET:-}"
S3_REGION="${S3_REGION:-us-east-1}"
GCS_BUCKET="${GCS_BUCKET:-}"
ENCRYPTION_KEY="${ENCRYPTION_KEY:-}"

# Timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="alphapro_${TIMESTAMP}.sql.gz.enc"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE" >&2
}

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

# Extract connection details from DATABASE_URL
parse_db_url() {
    local url="$1"
    # Format: postgresql://user:pass@host:port/dbname
    export PGUSER=$(echo "$url" | sed -E 's|.*://([^:]+):.*|\1|')
    export PGPASSWORD=$(echo "$url" | sed -E 's|.*://[^:]+:([^@]+)@.*|\1|')
    export PGHOST=$(echo "$url" | sed -E 's|.*@([^:]+):.*|\1|')
    export PGPORT=$(echo "$url" | sed -E 's|.*:([0-9]+)/.*|\1|')
    export PGDATABASE=$(echo "$url" | sed -E 's|.*/([^?]+).*|\1|')
}

# Perform backup
perform_backup() {
    log "Starting database backup..."
    
    # Parse database URL
    parse_db_url "$DATABASE_URL"
    
    # Export password for pg_dump
    export PGPASSWORD
    
    # Create backup filename
    local backup_path="${BACKUP_DIR}/${BACKUP_FILE}"
    local temp_file="${BACKUP_DIR}/alphapro_${TIMESTAMP}.sql.gz"
    
    # Run pg_dump
    if pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -F c -b -v -f "$temp_file" 2>&1 | tee -a "$LOG_FILE"; then
        log "Backup created successfully: $temp_file"
    else
        log_error "Backup failed!"
        return 1
    fi
    
    # Encrypt if key provided
    if [ -n "$ENCRYPTION_KEY" ]; then
        log "Encrypting backup..."
        openssl enc -aes-256-cbc -salt -in "$temp_file" -out "$backup_path" -pass pass:"$ENCRYPTION_KEY"
        rm -f "$temp_file"
        log "Backup encrypted and saved to: $backup_path"
    else
        mv "$temp_file" "$backup_path"
        log "Backup saved to: $backup_path"
    fi
    
    # Upload to S3 if configured
    if [ -n "$S3_BUCKET" ]; then
        upload_to_s3 "$backup_path"
    fi
    
    # Upload to GCS if configured
    if [ -n "$GCS_BUCKET" ]; then
        upload_to_gcs "$backup_path"
    fi
    
    # Clean up old backups
    cleanup_old_backups
    
    log "Backup completed successfully!"
}

# Upload to AWS S3
upload_to_s3() {
    local file="$1"
    log "Uploading to S3 bucket: $S3_BUCKET"
    
    if command -v aws &> /dev/null; then
        aws s3 cp "$file" "s3://${S3_BUCKET}/backups/" --region "$S3_REGION"
        log "Uploaded to S3 successfully"
    else
        log_error "AWS CLI not installed, skipping S3 upload"
    fi
}

# Upload to Google Cloud Storage
upload_to_gcs() {
    local file="$1"
    log "Uploading to GCS bucket: $GCS_BUCKET"
    
    if command -v gsutil &> /dev/null; then
        gsutil cp "$file" "gs://${GCS_BUCKET}/backups/"
        log "Uploaded to GCS successfully"
    else
        log_error "gsutil not installed, skipping GCS upload"
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up backups older than ${RETENTION_DAYS} days..."
    
    # Local cleanup
    find "$BACKUP_DIR" -name "alphapro_*.sql.gz*" -type f -mtime +"$RETENTION_DAYS" -delete
    
    # S3 cleanup
    if [ -n "$S3_BUCKET" ] && command -v aws &> /dev/null; then
        aws s3 ls "s3://${S3_BUCKET}/backups/" | while read -r line; do
            local filename=$(echo "$line" | awk '{print $4}')
            local filedate=$(echo "$line" | awk '{print $1,$2}')
            local timestamp=$(date -d "$filedate" +%s 2>/dev/null || echo 0)
            local now=$(date +%s)
            local days=$(( (now - timestamp) / 86400 ))
            
            if [ "$days" -gt "$RETENTION_DAYS" ]; then
                aws s3 rm "s3://${S3_BUCKET}/backups/$filename"
                log "Deleted old S3 backup: $filename"
            fi
        done
    fi
    
    log "Cleanup completed"
}

# Verify backup integrity
verify_backup() {
    local file="$1"
    log "Verifying backup integrity..."
    
    if [ -f "$file" ]; then
        if [ "${file##*.}" = "enc" ]; then
            # For encrypted files, just check file size
            local size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file")
            if [ "$size" -gt 0 ]; then
                log "Backup verified: $file ($size bytes)"
                return 0
            fi
        else
            # For unencrypted, try to read header
            if gunzip -t "$file" 2>/dev/null; then
                log "Backup verified: $file"
                return 0
            fi
        fi
    fi
    
    log_error "Backup verification failed: $file"
    return 1
}

# Restore from backup
restore_backup() {
    local backup_file="$1"
    local target_db="${2:-alphapro}"
    
    log "Restoring backup from: $backup_file"
    
    parse_db_url "$DATABASE_URL"
    export PGPASSWORD
    
    # Drop existing database (optional, use with caution)
    # psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -c "DROP DATABASE IF EXISTS $target_db;"
    # psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -c "CREATE DATABASE $target_db;"
    
    # Restore
    if [ "${backup_file##*.}" = "enc" ]; then
        # Decrypt first
        local temp_file="/tmp/alphapro_restore_$$.sql.gz"
        openssl enc -aes-256-cbc -d -in "$backup_file" -out "$temp_file" -pass pass:"$ENCRYPTION_KEY"
        pg_restore -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$target_db" -c "$temp_file"
        rm -f "$temp_file"
    else
        pg_restore -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$target_db" -c "$backup_file"
    fi
    
    log "Restore completed successfully"
}

# Health check
health_check() {
    parse_db_url "$DATABASE_URL"
    export PGPASSWORD
    
    if pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" > /dev/null 2>&1; then
        log "Database health check: OK"
        return 0
    else
        log_error "Database health check: FAILED"
        return 1
    fi
}

# Main
case "${1:-backup}" in
    backup)
        perform_backup
        ;;
    restore)
        if [ -z "${2:-}" ]; then
            echo "Usage: $0 restore <backup_file> [target_database]"
            exit 1
        fi
        restore_backup "$2" "${3:-}"
        ;;
    verify)
        if [ -z "${2:-}" ]; then
            echo "Usage: $0 verify <backup_file>"
            exit 1
        fi
        verify_backup "$2"
        ;;
    health)
        health_check
        ;;
    cleanup)
        cleanup_old_backups
        ;;
    *)
        echo "Usage: {backup|restore|verify|health|cleanup}"
        exit 1
        ;;
esac
