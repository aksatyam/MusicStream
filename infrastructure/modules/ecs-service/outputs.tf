output "service_name" {
  value = aws_ecs_service.service.name
}

output "service_arn" {
  value = aws_ecs_service.service.id
}

output "task_definition_arn" {
  value = aws_ecs_task_definition.service.arn
}

output "task_role_arn" {
  value = aws_iam_role.task.arn
}
