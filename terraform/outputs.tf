output "api_public_ip" {
  value = aws_instance.api_server.public_ip
}

output "s3_frontend_url" {
  value = aws_s3_bucket.frontend.website_endpoint
}

output "cloudfront_url" {
  value = "https://${aws_cloudfront_distribution.frontend_cdn.domain_name}"
}

output "private_key_pem" {
  value     = tls_private_key.ec2_key.private_key_pem
  sensitive = true
}

output "key_pair_name" {
  value = aws_key_pair.generated_key.key_name
}