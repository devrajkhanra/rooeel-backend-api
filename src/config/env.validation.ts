type Env = Record<string, string | undefined>;

function requireVar(env: Env, key: string): string {
  const value = env[key];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function validateEnv(env: Env): Env {
  const nodeEnv = env.NODE_ENV || 'development';
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('NODE_ENV must be one of: development, test, production');
  }

  requireVar(env, 'DATABASE_URL');
  requireVar(env, 'JWT_SECRET');
  requireVar(env, 'JWT_ACCESS_EXPIRY');
  requireVar(env, 'JWT_REFRESH_EXPIRY');
  requireVar(env, 'FRONTEND_URL');

  const useMinio = (env.USE_MINIO || 'true').toLowerCase() === 'true';
  if (useMinio) {
    requireVar(env, 'MINIO_ROOT_USER');
    requireVar(env, 'MINIO_ROOT_PASSWORD');
    requireVar(env, 'MINIO_BUCKET');
  } else {
    requireVar(env, 'AWS_REGION');
    requireVar(env, 'AWS_ACCESS_KEY_ID');
    requireVar(env, 'AWS_SECRET_ACCESS_KEY');
    requireVar(env, 'MINIO_BUCKET');
  }

  return env;
}
