output "endpoint" {
  value = aws_db_instance.main.endpoint
}

output "address" {
  value = aws_db_instance.main.address
}

output "instance_id" {
  value = aws_db_instance.main.id
}

output "connection_url" {
  value     = "postgresql://musicstream:${random_password.db_password.result}@${aws_db_instance.main.endpoint}/musicstream"
  sensitive = true
}

output "db_password_secret_arn" {
  value = aws_secretsmanager_secret.db_password.arn
}
