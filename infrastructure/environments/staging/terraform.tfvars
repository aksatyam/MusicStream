# Staging environment - moderate resources
project_name   = "musicstream"
environment    = "staging"
aws_region     = "ap-south-1"

# Networking
vpc_cidr           = "10.0.0.0/16"
nat_gateway_count  = 1

# ECS API Service
ecs_api_cpu       = 512
ecs_api_memory    = 1024
ecs_api_min_count = 2
ecs_api_max_count = 5

# Database
rds_instance_class    = "db.t3.medium"
rds_multi_az          = false
backup_retention_days = 7

# Cache
redis_node_type = "cache.t3.small"

# Extractors
invidious_min_count = 2
invidious_max_count = 4
piped_min_count     = 1
piped_max_count     = 3

# Features
enable_waf         = true
cloudfront_enabled = true
