variable "resource_group_name" {
  description = "Name of the resource group"
  default     = "zk-rollup-rg"
}

variable "location" {
  description = "Azure region"
  default     = "East US"
}

variable "cluster_name" {
  description = "Name of the AKS cluster"
  default     = "zk-rollup-cluster"
}

variable "node_count" {
  description = "Number of worker nodes"
  default     = 1
}

variable "vm_size" {
  description = "Size of the VM"
  default     = "standard_dc2s_v3"
}