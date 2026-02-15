# Production environment - full resources with HA
project_name   = "musicstream"
environment    = "production"
aws_region     = "ap-south-1"

# Networking
vpc_cidr           = "10.0.0.0/16"
nat_gateway_count  = 3

# ECS API Service
ecs_api_cpu       = 1024
ecs_api_memory    = 2048
ecs_api_min_count = 3
ecs_api_max_count = 15

# Database
rds_instance_class    = "db.r6g.large"
rds_multi_az          = true
backup_retention_days = 30

# Cache
redis_node_type = "cache.r6g.large"

# Extractors
invidious_min_count = 3
invidious_max_count = 8
piped_min_count     = 2
piped_max_count     = 6

# Features
enable_waf         = true
cloudfront_enabled = true
