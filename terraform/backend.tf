terraform {
  backend "s3" {
    bucket  = "bulk-logistic-terraform-state"
    key     = "terraform.tfstate"
    region  = "us-east-1"
    encrypt = true
    acl     = "bucket-owner-full-control"
  }
}
