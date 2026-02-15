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
    key            = "dev/terraform.tfstate"
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

# ---------- Networking ----------
module "networking" {
  source = "../../modules/networking"

  project_name      = var.project_name
  environment       = var.environment
  vpc_cidr          = var.vpc_cidr
  availability_zones = var.availability_zones
  nat_gateway_count  = var.nat_gateway_count
}

# ---------- Security ----------
module "security" {
  source = "../../modules/security"

  project_name = var.project_name
  environment  = var.environment
  vpc_id       = module.networking.vpc_id
  vpc_cidr     = var.vpc_cidr
  enable_waf   = var.enable_waf
}

# ---------- ECR ----------
module "ecr" {
  source = "../../modules/ecr"

  project_name = var.project_name
  environment  = var.environment
}

# ---------- ECS Cluster ----------
module "ecs_cluster" {
  source = "../../modules/ecs-cluster"

  project_name = var.project_name
  environment  = var.environment
}

# ---------- RDS (PostgreSQL) ----------
module "rds" {
  source = "../../modules/rds"

  project_name       = var.project_name
  environment        = var.environment
  vpc_id             = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnet_ids
  instance_class     = var.rds_instance_class
  multi_az           = var.rds_multi_az
  db_security_group_id = module.security.rds_security_group_id
  backup_retention_days = var.backup_retention_days
}

# ---------- ElastiCache (Redis) ----------
module "elasticache" {
  source = "../../modules/elasticache"

  project_name       = var.project_name
  environment        = var.environment
  vpc_id             = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnet_ids
  node_type          = var.redis_node_type
  redis_security_group_id = module.security.redis_security_group_id
}

# ---------- ALB ----------
module "alb" {
  source = "../../modules/alb"

  project_name      = var.project_name
  environment       = var.environment
  vpc_id            = module.networking.vpc_id
  public_subnet_ids = module.networking.public_subnet_ids
  alb_security_group_id = module.security.alb_security_group_id
}

# ---------- S3 ----------
module "s3" {
  source = "../../modules/s3"

  project_name = var.project_name
  environment  = var.environment
}

# ---------- ECS Service: API ----------
module "ecs_service_api" {
  source = "../../modules/ecs-service"

  project_name       = var.project_name
  environment        = var.environment
  service_name       = "api"
  ecs_cluster_id     = module.ecs_cluster.cluster_id
  private_subnet_ids = module.networking.private_subnet_ids
  security_group_id  = module.security.ecs_security_group_id
  target_group_arn   = module.alb.api_target_group_arn
  container_image    = "${module.ecr.api_repository_url}:latest"
  container_port     = 3000
  cpu                = var.ecs_api_cpu
  memory             = var.ecs_api_memory
  min_count          = var.ecs_api_min_count
  max_count          = var.ecs_api_max_count
  health_check_path  = "/api/health"

  environment_variables = {
    NODE_ENV         = var.environment
    DATABASE_URL     = module.rds.connection_url
    REDIS_URL        = module.elasticache.connection_url
    INVIDIOUS_URL    = "http://invidious.${var.project_name}.local:3001"
    PIPED_URL        = "http://piped.${var.project_name}.local:3002"
    NEWPIPE_URL      = "http://newpipe.${var.project_name}.local:3004"
    S3_BUCKET        = module.s3.assets_bucket_name
    JWT_SECRET_ARN   = module.security.jwt_secret_arn
  }
}

# ---------- ECS Service: Invidious ----------
module "ecs_service_invidious" {
  source = "../../modules/ecs-service"

  project_name       = var.project_name
  environment        = var.environment
  service_name       = "invidious"
  ecs_cluster_id     = module.ecs_cluster.cluster_id
  private_subnet_ids = module.networking.private_subnet_ids
  security_group_id  = module.security.ecs_security_group_id
  target_group_arn   = module.alb.invidious_target_group_arn
  container_image    = "quay.io/invidious/invidious:latest"
  container_port     = 3001
  cpu                = 1024
  memory             = 2048
  min_count          = var.invidious_min_count
  max_count          = var.invidious_max_count
  health_check_path  = "/api/v1/stats"

  environment_variables = {
    INVIDIOUS_CONFIG = <<-EOT
      database_url: ${module.rds.connection_url}
      check_tables: true
      port: 3001
      external_port: 443
      host_binding: 0.0.0.0
      admins: []
      disable_proxy: false
      popular_enabled: true
      statistics_enabled: true
    EOT
  }
}

# ---------- ECS Service: Piped ----------
module "ecs_service_piped" {
  source = "../../modules/ecs-service"

  project_name       = var.project_name
  environment        = var.environment
  service_name       = "piped"
  ecs_cluster_id     = module.ecs_cluster.cluster_id
  private_subnet_ids = module.networking.private_subnet_ids
  security_group_id  = module.security.ecs_security_group_id
  target_group_arn   = module.alb.piped_target_group_arn
  container_image    = "1337kavin/piped:latest"
  container_port     = 3002
  cpu                = 512
  memory             = 1024
  min_count          = var.piped_min_count
  max_count          = var.piped_max_count
  health_check_path  = "/healthcheck"

  environment_variables = {
    PORT = "3002"
  }
}

# ---------- Monitoring ----------
module "monitoring" {
  source = "../../modules/monitoring"

  project_name       = var.project_name
  environment        = var.environment
  ecs_cluster_name   = module.ecs_cluster.cluster_name
  alb_arn_suffix     = module.alb.alb_arn_suffix
  rds_instance_id    = module.rds.instance_id
}
