package test
import (
	"testing"
	"github.com/gruntwork-io/terratest/modules/terraform"
	"github.com/stretchr/testify/assert"
)

func TestTerraformVariables(t *testing.T) {
    terraformOptions := terraform.WithDefaultRetryableErrors(t, &terraform.Options{
        TerraformDir: "../",
        Reconfigure:  true,
    })

    defer terraform.Destroy(t, terraformOptions)

    terraform.InitAndApply(t, terraformOptions)

    budgetEmails := terraform.Output(t, terraformOptions, "budget_notification_emails")
    assert.Contains(t, budgetEmails, "Lerato.Taunyane@bbd.co.za")
}