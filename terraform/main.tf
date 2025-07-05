provider "aws" {
  alias  = "af_south"
  region = "af-south-1"
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
  provider   = aws.af_south
  key_name   = "my-terraform-key"
  public_key = tls_private_key.ec2_key.public_key_openssh
}

data "aws_vpc" "default" {
  provider = aws.af_south
  default  = true
}

data "aws_subnet_ids" "default" {
  provider = aws.af_south
  vpc_id   = data.aws_vpc.default.id
}

data "aws_subnet" "first" {
  provider = aws.af_south
  id       = data.aws_subnet_ids.default.ids[0]
}

data "aws_ami" "ubuntu" {
  provider    = aws.af_south
  most_recent = true

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*"]
  }

  owners = ["099720109477"]
}

resource "aws_instance" "api_server" {
  provider                = aws.af_south
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = "t2.micro"
  key_name               = aws_key_pair.generated_key.key_name
  subnet_id              = data.aws_subnet.first.id
  vpc_security_group_ids = [aws_security_group.api_sg.id]

  user_data = <<-EOF
              #!/bin/bash
              apt update -y
              apt install -y postgresql postgresql-contrib nginx curl ufw git

              systemctl enable postgresql
              systemctl start postgresql
              sudo -u postgres psql -c "CREATE USER myuser WITH PASSWORD 'mypassword';"
              sudo -u postgres createdb mydb -O myuser

              apt install -y nodejs npm
              git clone https://github.com/miniconomy2025/bulk-logistics.git /home/ubuntu/bulk-logistics
              cd /home/ubuntu/bulk-logistics/backend
              npm install
              npm run build
              npm install -g pm2
              pm2 start dist/src/app.js --name bulk-logistics-backend

              ufw allow 22
              ufw allow 3000
              ufw --force enable
            EOF
}


