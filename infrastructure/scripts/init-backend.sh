#!/usr/bin/env bash
# Initialize Terraform remote state backend (S3 + DynamoDB)
# Run this ONCE before first terraform init
set -euo pipefail

REGION="${AWS_REGION:-ap-south-1}"
STATE_BUCKET="musicstream-terraform-state"
LOCK_TABLE="musicstream-terraform-locks"

echo "==> Creating S3 bucket for Terraform state..."
aws s3api create-bucket \
  --bucket "$STATE_BUCKET" \
  --region "$REGION" \
  --create-bucket-configuration LocationConstraint="$REGION" \
  2>/dev/null || echo "    Bucket already exists"

echo "==> Enabling versioning on state bucket..."
aws s3api put-bucket-versioning \
  --bucket "$STATE_BUCKET" \
  --versioning-configuration Status=Enabled

echo "==> Enabling encryption on state bucket..."
aws s3api put-bucket-encryption \
  --bucket "$STATE_BUCKET" \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

echo "==> Blocking public access on state bucket..."
aws s3api put-public-access-block \
  --bucket "$STATE_BUCKET" \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

echo "==> Creating DynamoDB table for state locking..."
aws dynamodb create-table \
  --table-name "$LOCK_TABLE" \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region "$REGION" \
  2>/dev/null || echo "    Table already exists"

echo ""
echo "==> Backend initialized successfully!"
echo "    State bucket: s3://$STATE_BUCKET"
echo "    Lock table:   $LOCK_TABLE"
echo "    Region:       $REGION"
echo ""
echo "    Next: cd infrastructure/environments/dev && terraform init"
