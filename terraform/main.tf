# Configuración del proveedor de Alibaba Cloud
terraform {
  required_providers {
    alicloud = {
      source  = "aliyun/alicloud"
      version = "~> 1.200"
    }
  }
  required_version = ">= 1.0"
}

# Configurar el proveedor
provider "alicloud" {
  region = var.region
}

# Variables
variable "region" {
  description = "Región de Alibaba Cloud"
  type        = string
  default     = "cn-hangzhou"
}

variable "project_name" {
  description = "Nombre del proyecto"
  type        = string
  default     = "studiogen"
}

variable "environment" {
  description = "Ambiente (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "instance_type_web" {
  description = "Tipo de instancia para el servidor web"
  type        = string
  default     = "ecs.t6-c1m2.large"
}

variable "instance_type_db" {
  description = "Tipo de instancia para la base de datos"
  type        = string
  default     = "mysql.n2.medium.1"
}

variable "db_password" {
  description = "Contraseña de la base de datos"
  type        = string
  sensitive   = true
}

variable "ssh_public_key" {
  description = "Clave pública SSH"
  type        = string
}

variable "domain_name" {
  description = "Nombre de dominio"
  type        = string
  default     = ""
}

# Datos locales
locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# VPC
resource "alicloud_vpc" "main" {
  vpc_name   = "${var.project_name}-vpc-${var.environment}"
  cidr_block = "10.0.0.0/16"
  tags       = local.common_tags
}

# Subred pública para servidores web
resource "alicloud_vswitch" "public" {
  vpc_id       = alicloud_vpc.main.id
  cidr_block   = "10.0.1.0/24"
  zone_id      = data.alicloud_zones.available.zones[0].id
  vswitch_name = "${var.project_name}-public-subnet-${var.environment}"
  tags         = local.common_tags
}

# Subred privada para base de datos
resource "alicloud_vswitch" "private" {
  vpc_id       = alicloud_vpc.main.id
  cidr_block   = "10.0.2.0/24"
  zone_id      = data.alicloud_zones.available.zones[1].id
  vswitch_name = "${var.project_name}-private-subnet-${var.environment}"
  tags         = local.common_tags
}

# Internet Gateway
resource "alicloud_nat_gateway" "main" {
  vpc_id           = alicloud_vpc.main.id
  nat_gateway_name = "${var.project_name}-nat-${var.environment}"
  payment_type     = "PayAsYouGo"
  vswitch_id       = alicloud_vswitch.public.id
  nat_type         = "Enhanced"
  tags             = local.common_tags
}

# EIP para NAT Gateway
resource "alicloud_eip_address" "nat" {
  address_name         = "${var.project_name}-nat-eip-${var.environment}"
  isp                  = "BGP"
  internet_charge_type = "PayByBandwidth"
  bandwidth            = "10"
  tags                 = local.common_tags
}

# Asociar EIP con NAT Gateway
resource "alicloud_eip_association" "nat" {
  allocation_id = alicloud_eip_address.nat.id
  instance_id   = alicloud_nat_gateway.main.id
}

# EIP para servidor web
resource "alicloud_eip_address" "web" {
  address_name         = "${var.project_name}-web-eip-${var.environment}"
  isp                  = "BGP"
  internet_charge_type = "PayByBandwidth"
  bandwidth            = "10"
  tags                 = local.common_tags
}

# Obtener zonas disponibles
data "alicloud_zones" "available" {
  available_disk_category     = "cloud_efficiency"
  available_resource_creation = "VSwitch"
}

# Security Group para servidor web
resource "alicloud_security_group" "web" {
  security_group_name = "${var.project_name}-web-sg-${var.environment}"
  description         = "Security group para servidores web"
  vpc_id              = alicloud_vpc.main.id
  tags                = local.common_tags
}

# Reglas de seguridad para servidor web
resource "alicloud_security_group_rule" "web_ssh" {
  type              = "ingress"
  ip_protocol       = "tcp"
  nic_type          = "intranet"
  policy            = "accept"
  port_range        = "22/22"
  priority          = 1
  security_group_id = alicloud_security_group.web.id
  cidr_ip           = "0.0.0.0/0"
}

resource "alicloud_security_group_rule" "web_http" {
  type              = "ingress"
  ip_protocol       = "tcp"
  nic_type          = "intranet"
  policy            = "accept"
  port_range        = "80/80"
  priority          = 1
  security_group_id = alicloud_security_group.web.id
  cidr_ip           = "0.0.0.0/0"
}

resource "alicloud_security_group_rule" "web_https" {
  type              = "ingress"
  ip_protocol       = "tcp"
  nic_type          = "intranet"
  policy            = "accept"
  port_range        = "443/443"
  priority          = 1
  security_group_id = alicloud_security_group.web.id
  cidr_ip           = "0.0.0.0/0"
}

resource "alicloud_security_group_rule" "web_app" {
  type              = "ingress"
  ip_protocol       = "tcp"
  nic_type          = "intranet"
  policy            = "accept"
  port_range        = "9002/9002"
  priority          = 1
  security_group_id = alicloud_security_group.web.id
  cidr_ip           = "0.0.0.0/0"
}

# Security Group para base de datos
resource "alicloud_security_group" "db" {
  security_group_name = "${var.project_name}-db-sg-${var.environment}"
  description         = "Security group para base de datos"
  vpc_id              = alicloud_vpc.main.id
  tags                = local.common_tags
}

# Reglas de seguridad para base de datos
resource "alicloud_security_group_rule" "db_mysql" {
  type              = "ingress"
  ip_protocol       = "tcp"
  nic_type          = "intranet"
  policy            = "accept"
  port_range        = "3306/3306"
  priority          = 1
  security_group_id = alicloud_security_group.db.id
  cidr_ip           = "10.0.1.0/24"
}

# Par de claves SSH
resource "alicloud_ecs_key_pair" "main" {
  key_pair_name = "${var.project_name}-keypair-${var.environment}"
  public_key    = var.ssh_public_key
  tags          = local.common_tags
}

# Obtener imagen de Ubuntu
data "alicloud_images" "ubuntu" {
  most_recent = true
  owners      = "system"
  name_regex  = "^ubuntu_22_04_x64*"
}

# Instancia ECS para servidor web
resource "alicloud_instance" "web" {
  availability_zone    = data.alicloud_zones.available.zones[0].id
  security_groups      = [alicloud_security_group.web.id]
  instance_type        = var.instance_type_web
  system_disk_category = "cloud_efficiency"
  system_disk_size     = 40
  image_id             = data.alicloud_images.ubuntu.images[0].id
  instance_name        = "${var.project_name}-web-${var.environment}"
  vswitch_id           = alicloud_vswitch.public.id
  key_name             = alicloud_ecs_key_pair.main.key_pair_name

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-web-${var.environment}"
    Type = "WebServer"
  })

  user_data = base64encode(templatefile("${path.module}/user_data.sh", {
    project_name = var.project_name
    environment  = var.environment
  }))
}

# Asociar EIP con instancia web
resource "alicloud_eip_association" "web" {
  allocation_id = alicloud_eip_address.web.id
  instance_id   = alicloud_instance.web.id
}

# RDS Instance para MySQL
resource "alicloud_db_instance" "main" {
  engine               = "MySQL"
  engine_version       = "8.0"
  instance_type        = var.instance_type_db
  instance_storage     = 20
  instance_charge_type = "Postpaid"
  instance_name        = "${var.project_name}-db-${var.environment}"
  vswitch_id           = alicloud_vswitch.private.id
  security_group_ids   = [alicloud_security_group.db.id]

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-db-${var.environment}"
    Type = "Database"
  })
}

# Base de datos
resource "alicloud_db_database" "main" {
  instance_id   = alicloud_db_instance.main.id
  name          = var.project_name
  character_set = "utf8mb4"
}

# Usuario de base de datos
resource "alicloud_db_account" "main" {
  db_instance_id   = alicloud_db_instance.main.id
  account_name     = var.project_name
  account_password = var.db_password
  account_type     = "Normal"
}

# Privilegios de base de datos
resource "alicloud_db_account_privilege" "main" {
  instance_id  = alicloud_db_instance.main.id
  account_name = alicloud_db_account.main.account_name
  privilege    = "ReadWrite"
  db_names     = [alicloud_db_database.main.name]
}

# Load Balancer (opcional)
resource "alicloud_slb_load_balancer" "main" {
  load_balancer_name = "${var.project_name}-lb-${var.environment}"
  vswitch_id         = alicloud_vswitch.public.id
  load_balancer_spec = "slb.s2.small"
  address_type       = "internet"
  tags               = local.common_tags
}

# Listener para Load Balancer
resource "alicloud_slb_listener" "http" {
  load_balancer_id          = alicloud_slb_load_balancer.main.id
  backend_port              = 80
  frontend_port             = 80
  protocol                  = "http"
  bandwidth                 = 10
  health_check_connect_port = 80
  healthy_threshold         = 2
  unhealthy_threshold       = 2
  health_check_timeout      = 5
  health_check_interval     = 2
  health_check_uri          = "/health"
  health_check_http_code    = "http_2xx"
}

# HTTPS Listener (comentado hasta que se configure SSL)
# resource "alicloud_slb_listener" "https" {
#   load_balancer_id          = alicloud_slb_load_balancer.main.id
#   backend_port              = 443
#   frontend_port             = 443
#   protocol                  = "https"
#   bandwidth                 = 10
#   ssl_certificate_id        = var.domain_name != "" ? alicloud_ssl_certificates_service_certificate.main[0].id : null
#   health_check_connect_port = 443
#   healthy_threshold         = 2
#   unhealthy_threshold       = 2
#   health_check_timeout      = 5
#   health_check_interval     = 2
#   health_check_uri          = "/health"
#   health_check_http_code    = "http_2xx"
# }

# Certificado SSL (opcional) - Se debe configurar manualmente o usar Let's Encrypt
# resource "alicloud_ssl_certificates_service_certificate" "main" {
#   count            = var.domain_name != "" ? 1 : 0
#   certificate_name = "${var.project_name}-cert-${var.environment}"
#   cert             = var.ssl_cert_content
#   key              = var.ssl_key_content
# }

# Outputs
output "vpc_id" {
  description = "ID de la VPC"
  value       = alicloud_vpc.main.id
}

output "web_instance_id" {
  description = "ID de la instancia web"
  value       = alicloud_instance.web.id
}

output "web_public_ip" {
  description = "IP pública del servidor web"
  value       = alicloud_eip_address.web.ip_address
}

output "db_connection_string" {
  description = "String de conexión de la base de datos"
  value       = alicloud_db_instance.main.connection_string
  sensitive   = true
}

output "load_balancer_address" {
  description = "Dirección del Load Balancer"
  value       = alicloud_slb_load_balancer.main.address
}

output "ssh_command" {
  description = "Comando SSH para conectar al servidor"
  value       = "ssh -i ~/.ssh/id_rsa ubuntu@${alicloud_eip_address.web.ip_address}"
}
