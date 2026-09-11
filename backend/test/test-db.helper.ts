import { MongoMemoryServer } from 'mongodb-memory-server';

export async function startTestDb(): Promise<{
  uri: string;
  stop: () => Promise<void>;
}> {
  const server = await MongoMemoryServer.create();
  const uri = server.getUri();
  process.env.MONGODB_URI = uri;
  process.env.JWT_SECRET = 'test-secret';
  process.env.ADMIN_EMAIL = 'admin@br7.com';
  process.env.ADMIN_PASSWORD = 'test-admin-password';
  return { uri, stop: () => server.stop() };
}
