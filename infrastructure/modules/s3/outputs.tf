output "assets_bucket_name" {
  value = aws_s3_bucket.assets.id
}

output "assets_bucket_arn" {
  value = aws_s3_bucket.assets.arn
}

output "backups_bucket_name" {
  value = aws_s3_bucket.backups.id
}

output "assets_bucket_domain" {
  value = aws_s3_bucket.assets.bucket_regional_domain_name
}
