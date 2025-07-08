terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 4.0.0"
    }
  }
  required_version = ">= 1.0.0"
}
provider "aws" {
  alias  = "us_east"
  region = "us-east-1"
}

resource "tls_private_key" "ec2_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "generated_key" {
  key_name   = "my-terraform-key"
  public_key = tls_private_key.ec2_key.public_key_openssh
}

resource "aws_default_vpc" "default_vpc" {
  tags = {
    Name = "default_vpc"
  }
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [aws_default_vpc.default_vpc.id]
  }
}

data "aws_subnet" "first" {
 id = data.aws_subnets.default.ids[0]
}

data "aws_ami" "ubuntu" {
  most_recent = true

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*"]
  }

  owners = ["099720109477"]
}

resource "aws_instance" "api_server" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = "t2.micro"
  key_name               = aws_key_pair.generated_key.key_name
  subnet_id              = data.aws_subnet.first.id
  associate_public_ip_address = true
  vpc_security_group_ids = [aws_security_group.api_sg.id]
  iam_instance_profile    = aws_iam_instance_profile.ec2_ssm_profile.name

  user_data = <<-EOF
              #!/bin/bash
              apt update -y
              apt install -y awscli postgresql postgresql-contrib nginx curl git

              # Retrieve DB password from SSM
              DB_PASSWORD=$(aws ssm get-parameter --region af-south-1 --name "/bulk-logistics/db-password" --with-decryption --query "Parameter.Value" --output text)

              systemctl enable postgresql
              systemctl start postgresql
              sudo -u postgres psql -c "CREATE USER bulk-logistic WITH PASSWORD '$${DB_PASSWORD}';"
              sudo -u postgres createdb bldatabase -O bulk-logistic

              apt install -y nodejs npm
              git clone https://github.com/miniconomy2025/bulk-logistics.git /home/ubuntu/bulk-logistics
              cd /home/ubuntu/bulk-logistics/backend
              npm install
              npm run build
              npm install -g pm2
              pm2 start dist/src/app.js --name bulk-logistics-backend
            EOF
  tags = {
    Name = "bulk-logistics-api"
  }
}
resource "aws_eip" "api_eip" {
  instance = aws_instance.api_server.id
}


resource "aws_instance" "frontend_server" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = "t2.micro"
  key_name                    = aws_key_pair.generated_key.key_name
  subnet_id                   = data.aws_subnet.first.id
  associate_public_ip_address = true
  vpc_security_group_ids      = [aws_security_group.frontend_sg.id]
  iam_instance_profile        = aws_iam_instance_profile.ec2_ssm_profile.name

  user_data = <<-EOF
              #!/bin/bash
              apt update -y
              apt install -y nginx git curl
              git clone https://github.com/miniconomy2025/bulk-logistics.git /var/www/frontend
              cp -r /var/www/frontend/frontend/* /var/www/html/
              systemctl restart nginx
              systemctl enable nginx
            EOF
  tags = {
    Name = "bulk-logistics-frontend"
  }
}

resource "aws_eip" "frontend_eip" {
  instance = aws_instance.frontend_server.id
}

resource "aws_budgets_budget" "bulk-logistics_budget" {
  name              = "bulk-logistics_budget"
  budget_type       = "COST"
  limit_amount      = "25"
  limit_unit        = "USD"
  time_period_start   = "2025-07-05_00:00"
  time_period_end = "2025-07-12_00:00"
  time_unit         = "MONTHLY"

  notification {
    comparison_operator        = "EQUAL_TO"
    threshold                  = 50
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = var.budget_notification_emails
  }

  notification {
    comparison_operator        = "EQUAL_TO"
    threshold                  = 75
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = var.budget_notification_emails
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 10
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.budget_notification_emails
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 20
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.budget_notification_emails
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 30
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.budget_notification_emails
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 40
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.budget_notification_emails
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 50
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.budget_notification_emails
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 60
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.budget_notification_emails
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.budget_notification_emails
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 90
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.budget_notification_emails
  }
}


