# main.tf - Main Terraform configuration for AlphaPro infrastructure

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket = "alphapro-terraform-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
}

# Variables
variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

# VPC Configuration
resource "aws_vpc" "alphapro" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = {
    Name        = "alphapro-vpc"
    Environment = var.environment
  }
}

# Public Subnets
resource "aws_subnet" "public_1" {
  vpc_id                  = aws_vpc.alphapro.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true
  
  tags = {
    Name        = "alphapro-public-1"
    Environment = var.environment
  }
}

resource "aws_subnet" "public_2" {
  vpc_id                  = aws_vpc.alphapro.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "${var.aws_region}b"
  map_public_ip_on_launch = true
  
  tags = {
    Name        = "alphapro-public-2"
    Environment = var.environment
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "alphapro" {
  name = "alphapro-cluster"
  
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
  
  tags = {
    Environment = var.environment
  }
}

# Outputs
output "vpc_id" {
  value = aws_vpc.alphapro.id
}

output "ecs_cluster_arn" {
  value = aws_ecs_cluster.alphapro.arn
}
