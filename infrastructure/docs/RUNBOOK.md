# MusicStream Infrastructure Runbook

## First-Time Setup

1. **Configure AWS credentials:**
   ```bash
   aws configure --profile musicstream
   export AWS_PROFILE=musicstream
   ```

2. **Initialize Terraform backend (S3 + DynamoDB):**
   ```bash
   chmod +x infrastructure/scripts/init-backend.sh
   ./infrastructure/scripts/init-backend.sh
   ```

3. **Initialize Terraform for dev:**
   ```bash
   cd infrastructure/environments/dev
   terraform init
   ```

4. **Plan and review:**
   ```bash
   terraform plan -var-file=terraform.tfvars -out=tfplan
   ```

5. **Apply:**
   ```bash
   terraform apply tfplan
   ```

## Local Development

Start all services locally with Docker Compose:
```bash
docker compose up -d
```

Services available at:
- API: http://localhost:3000
- Invidious: http://localhost:3001
- Piped: http://localhost:3002
- MinIO Console: http://localhost:9001
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3005 (admin/admin)

## Common Operations

### Deploy new API version
```bash
docker build -t musicstream/api:latest ./backend
docker tag musicstream/api:latest <ECR_URL>:latest
docker push <ECR_URL>:latest
aws ecs update-service --cluster musicstream-dev --service musicstream-dev-api --force-new-deployment
```

### View Terraform state
```bash
cd infrastructure/environments/dev
terraform state list
terraform state show module.networking.aws_vpc.main
```

### Drift detection
```bash
terraform plan -var-file=terraform.tfvars -detailed-exitcode
# Exit code 2 = drift detected
```

## Troubleshooting

### Extractor health issues
Check extractor status via API: `GET /api/admin/extractors`
Check ECS service logs: `aws logs tail /ecs/musicstream-dev-invidious --follow`

### Database connection issues
Verify security groups allow ECS -> RDS on port 5432.
Check RDS endpoint: `terraform output -raw rds_endpoint`
