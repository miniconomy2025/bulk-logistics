output "api_public_ip" {
  value = aws_instance.api_server.public_dns
}
output "frontend_public_ip" {
  value = aws_instance.frontend_server.public_dns
}

output "key_pair_name" {
  value = aws_key_pair.generated_key.key_name
}
output "private_key_pem" {
  value     = tls_private_key.ec2_key.private_key_pem
  sensitive = true
}