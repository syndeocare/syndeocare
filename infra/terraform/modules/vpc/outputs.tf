output "vpc_id" {
  value = aws_vpc.this.id
}

output "vpc_cidr_block" {
  value = aws_vpc.this.cidr_block
}

output "public_subnet_ids" {
  value = [for subnet in values(aws_subnet.public) : subnet.id]
}

output "private_subnet_ids" {
  value = [for subnet in values(aws_subnet.private) : subnet.id]
}

output "database_subnet_ids" {
  value = [for subnet in values(aws_subnet.database) : subnet.id]
}

output "alb_security_group_id" {
  value = aws_security_group.alb.id
}
