# Dev environment - minimal resources for cost savings
project_name   = "musicstream"
environment    = "dev"
aws_region     = "ap-south-1"

# Networking
vpc_cidr           = "10.0.0.0/16"
nat_gateway_count  = 1

# ECS API Service
ecs_api_cpu       = 256
ecs_api_memory    = 512
ecs_api_min_count = 1
ecs_api_max_count = 2

# Database
rds_instance_class    = "db.t3.micro"
rds_multi_az          = false
backup_retention_days = 1

# Cache
redis_node_type = "cache.t3.micro"

# Extractors
invidious_min_count = 1
invidious_max_count = 2
piped_min_count     = 0
piped_max_count     = 1

# Features
enable_waf         = false
cloudfront_enabled = false
