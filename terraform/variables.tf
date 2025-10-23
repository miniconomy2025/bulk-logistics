variable "budget_notification_emails" {
  description = "List of email addresses to receive AWS Budget notifications"
  type        = list(string)
  default     = [
    "Lerato.Taunyane@bbd.co.za",
    "Gregory.Maselle@bbd.co.za",
    "joy@bbd.co.za",
    "Ndzalama.Mabasa@bbd.co.za",
    "Keith.Hughes@bbd.co.za",
    "rudolphe@bbdsoftware.com"
  ]
}

