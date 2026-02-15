#!/usr/bin/env bash
# Terraform plan and apply helper
# Usage: ./plan-and-apply.sh <environment> [apply]
set -euo pipefail

ENV="${1:-dev}"
ACTION="${2:-plan}"
INFRA_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_DIR="$INFRA_DIR/environments/$ENV"

if [ ! -d "$ENV_DIR" ]; then
  echo "Error: Environment '$ENV' not found at $ENV_DIR"
  exit 1
fi

cd "$ENV_DIR"

echo "==> Environment: $ENV"
echo "==> Directory:   $ENV_DIR"
echo ""

# Format check
echo "==> Running terraform fmt -check..."
terraform fmt -check -recursive "$INFRA_DIR" || {
  echo "    Formatting issues found. Run: terraform fmt -recursive infrastructure/"
  exit 1
}

# Validate
echo "==> Running terraform validate..."
terraform validate

if [ "$ACTION" = "plan" ]; then
  echo "==> Running terraform plan..."
  terraform plan -out=tfplan -var-file=terraform.tfvars
  echo ""
  echo "==> Plan saved to tfplan"
  echo "    To apply: $0 $ENV apply"

elif [ "$ACTION" = "apply" ]; then
  if [ -f tfplan ]; then
    echo "==> Applying saved plan..."
    terraform apply tfplan
    rm -f tfplan
  else
    echo "==> No saved plan found. Running plan first..."
    terraform plan -out=tfplan -var-file=terraform.tfvars
    echo ""
    read -rp "Apply this plan? [y/N] " confirm
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
      terraform apply tfplan
      rm -f tfplan
    else
      echo "Aborted."
    fi
  fi
else
  echo "Usage: $0 <environment> [plan|apply]"
  exit 1
fi
