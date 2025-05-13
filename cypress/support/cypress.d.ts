// Extend Cypress's ConfigOptions interface
declare namespace Cypress {
    interface ConfigOverrides {
      env: {
        dashboardName?: string; // Add your custom environment variable
        username?: string;      // Optional: Add other variables if needed
        password?: string;
      };
    }
  }

