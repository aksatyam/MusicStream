terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "musicstream-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "ap-south-1"
    encrypt        = true
    dynamodb_table = "musicstream-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "MusicStream"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Production uses the same module composition as dev
# See dev/main.tf for full module wiring - copy when ready
# Key differences: prevent_destroy lifecycle rules on RDS and S3
