# Start Here

This package is the complete reconstructed CampusFix AI HelpDesk project for the Azure VM named `project-1`.

## Before deployment

1. Read `README.md` from top to bottom.
2. Replace the four placeholders in `frontend/src/config.js` with your real Microsoft Entra IDs.
3. Create `/etc/campusfix/bootstrap.conf` on the VM using `deployment/bootstrap.conf.example`.
4. Create the two required Key Vault secrets: `CampusFix-DatabaseUrl` and `CampusFix-JwtSecret`.
5. Give the `project-1` VM managed identity the **Key Vault Secrets User** role.
6. Run `scripts/deploy.sh` on the VM.

Do not put a database password, JWT secret, Gemini key, or Peer API key in GitHub.

The intended production URL is:

`https://project-1-backend.eastasia.cloudapp.azure.com/campusfix/`

