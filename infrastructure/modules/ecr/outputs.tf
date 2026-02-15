output "api_repository_url" {
  value = aws_ecr_repository.repos["api"].repository_url
}

output "invidious_repository_url" {
  value = aws_ecr_repository.repos["invidious"].repository_url
}

output "piped_repository_url" {
  value = aws_ecr_repository.repos["piped"].repository_url
}

output "newpipe_repository_url" {
  value = aws_ecr_repository.repos["newpipe-extractor"].repository_url
}

output "repository_urls" {
  value = { for k, v in aws_ecr_repository.repos : k => v.repository_url }
}
