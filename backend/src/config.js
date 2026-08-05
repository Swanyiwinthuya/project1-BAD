import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';

const secretMap = {
  'CampusFix-DatabaseUrl': 'DATABASE_URL',
  'CampusFix-JwtSecret': 'JWT_SECRET',
  'CampusFix-GeminiApiKey': 'GEMINI_API_KEY',
  'CampusFix-GeminiModel': 'GEMINI_MODEL',
  'CampusFix-PeerInboundApiKey': 'PEER_INBOUND_API_KEY',
  'CampusFix-PeerOutboundApiKey': 'PEER_OUTBOUND_API_KEY',
  'CampusFix-PeerBaseUrl': 'PEER_BASE_URL',
  'CampusFix-AdminEmails': 'ADMIN_EMAILS'
};

let loaded = false;

export async function loadConfig() {
  if (loaded) return;

  const vaultUrl = process.env.KEY_VAULT_URL;
  if (vaultUrl) {
    const client = new SecretClient(vaultUrl, new DefaultAzureCredential());
    await Promise.all(
      Object.entries(secretMap).map(async ([secretName, envName]) => {
        try {
          const secret = await client.getSecret(secretName);
          if (secret.value) process.env[envName] = secret.value;
        } catch (error) {
          if (!['GEMINI_API_KEY', 'GEMINI_MODEL', 'PEER_INBOUND_API_KEY', 'PEER_OUTBOUND_API_KEY', 'PEER_BASE_URL', 'ADMIN_EMAILS'].includes(envName)) {
            throw new Error(`Unable to load required Key Vault secret ${secretName}: ${error.message}`);
          }
        }
      })
    );
  } else if (process.env.NODE_ENV === 'production') {
    throw new Error('KEY_VAULT_URL is required in production.');
  }

  const required = ['DATABASE_URL', 'JWT_SECRET', 'ENTRA_TENANT_ID', 'ENTRA_CLIENT_ID'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Missing required configuration: ${missing.join(', ')}`);

  process.env.GEMINI_MODEL ||= 'gemini-2.5-flash';
  process.env.APP_BASE_PATH ||= '/campusfix';
  process.env.PORT ||= '3100';
  loaded = true;
}

export function adminEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}
