output "public_bucket_name" {
  value = aws_s3_bucket.public.bucket
}

output "private_bucket_name" {
  value = aws_s3_bucket.private.bucket
}

output "public_bucket_arn" {
  value = aws_s3_bucket.public.arn
}

output "private_bucket_arn" {
  value = aws_s3_bucket.private.arn
}

output "task_access_policy_json" {
  value = data.aws_iam_policy_document.task_access.json
}
