variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "musicstream"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "ap-south-1"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["ap-south-1a", "ap-south-1b", "ap-south-1c"]
}

variable "nat_gateway_count" {
  description = "Number of NAT gateways (1 for dev, 3 for prod)"
  type        = number
  default     = 1
}

# ECS API
variable "ecs_api_cpu" {
  description = "CPU units for the API service"
  type        = number
  default     = 256
}

variable "ecs_api_memory" {
  description = "Memory (MB) for the API service"
  type        = number
  default     = 512
}

variable "ecs_api_min_count" {
  description = "Minimum number of API tasks"
  type        = number
  default     = 1
}

variable "ecs_api_max_count" {
  description = "Maximum number of API tasks"
  type        = number
  default     = 2
}

# RDS
variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "rds_multi_az" {
  description = "Enable Multi-AZ for RDS"
  type        = bool
  default     = false
}

# Redis
variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

# Extractors
variable "invidious_min_count" {
  description = "Min Invidious instances"
  type        = number
  default     = 1
}

variable "invidious_max_count" {
  description = "Max Invidious instances"
  type        = number
  default     = 2
}

variable "piped_min_count" {
  description = "Min Piped instances"
  type        = number
  default     = 0
}

variable "piped_max_count" {
  description = "Max Piped instances"
  type        = number
  default     = 1
}

# Features
variable "enable_waf" {
  description = "Enable WAF on ALB"
  type        = bool
  default     = false
}

variable "cloudfront_enabled" {
  description = "Enable CloudFront distribution"
  type        = bool
  default     = false
}

variable "backup_retention_days" {
  description = "Number of days to retain RDS backups"
  type        = number
  default     = 1
}
