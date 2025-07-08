output "api_public_ip" {
  value = aws_instance.api_server.public_dns
}
output "frontend_public_ip" {
  value = aws_instance.frontend_server.public_dns
}

output "key_pair_name" {
  value = aws_key_pair.generated_key.key_name
}
