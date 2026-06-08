locals {
  common_tags = var.tags
}

resource "aws_s3_bucket" "public" {
  bucket = var.public_bucket_name
  tags   = merge(local.common_tags, { Name = var.public_bucket_name })
}

resource "aws_s3_bucket" "private" {
  bucket = var.private_bucket_name
  tags   = merge(local.common_tags, { Name = var.private_bucket_name })
}

resource "aws_s3_bucket_ownership_controls" "public" {
  bucket = aws_s3_bucket.public.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_ownership_controls" "private" {
  bucket = aws_s3_bucket.private.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "public" {
  bucket = aws_s3_bucket.public.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_public_access_block" "private" {
  bucket = aws_s3_bucket.private.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "public" {
  bucket = aws_s3_bucket.public.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD", "PUT"]
    allowed_origins = var.cors_allowed_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_cors_configuration" "private" {
  bucket = aws_s3_bucket.private.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD", "PUT"]
    allowed_origins = var.cors_allowed_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

data "aws_iam_policy_document" "public_bucket_read" {
  statement {
    sid = "AllowPublicReadObjects"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.public.arn}/*"]
  }
}

resource "aws_s3_bucket_policy" "public" {
  bucket     = aws_s3_bucket.public.id
  policy     = data.aws_iam_policy_document.public_bucket_read.json
  depends_on = [aws_s3_bucket_public_access_block.public]
}

data "aws_iam_policy_document" "task_access" {
  statement {
    sid = "AllowBucketListing"

    actions = ["s3:ListBucket"]
    resources = [
      aws_s3_bucket.public.arn,
      aws_s3_bucket.private.arn,
    ]
  }

  statement {
    sid = "AllowObjectReadWrite"

    actions = [
      "s3:AbortMultipartUpload",
      "s3:DeleteObject",
      "s3:GetObject",
      "s3:PutObject",
    ]
    resources = [
      "${aws_s3_bucket.public.arn}/*",
      "${aws_s3_bucket.private.arn}/*",
    ]
  }
}
