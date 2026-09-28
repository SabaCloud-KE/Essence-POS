import { AppLoggerService, maskPhoneNumber, sanitizeMetadata } from './app-logger.service';
import * as fs from 'fs';
import * as path from 'path';

describe('AppLoggerService', () => {
  let service: AppLoggerService;
  const testStorageDir = path.resolve(process.cwd(), 'storage', 'logs');

  beforeEach(() => {
    service = new AppLoggerService();
    service.onModuleInit();
  });

  afterAll(async () => {
    // Wait for any remaining file writes
    await new Promise((resolve) => setTimeout(resolve, 300));
  });

  describe('Sanitization & Masking', () => {
    it('should mask phone numbers properly', () => {
      expect(maskPhoneNumber('254712345678')).toBe('2547****5678');
      expect(maskPhoneNumber('0712345678')).toBe('0712****5678');
      expect(maskPhoneNumber('123')).toBe('***');
      expect(maskPhoneNumber('')).toBe('');
      expect(maskPhoneNumber(null)).toBe('');
    });

    it('should recursively strip sensitive fields (passwords, tokens, secrets, JWTs, keys)', () => {
      const raw = {
        userId: 104,
        email: 'admin@essence.co.ke',
        password: 'SuperSecretPassword123!',
        passwordHash: '$2b$10$hashedstring...',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        jwt: 'jwt.token.here',
        apiKey: 'daraja_consumer_key_xyz',
        mfaSecret: 'JBSWY3DPEHPK3PXP',
        customerPhone: '254712345678',
        nested: {
          subSecret: 'secret_value',
          normalData: 'safe_text',
        },
      };

      const sanitized = sanitizeMetadata(raw);

      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.passwordHash).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.jwt).toBe('[REDACTED]');
      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.mfaSecret).toBe('[REDACTED]');
      expect(sanitized.nested.subSecret).toBe('[REDACTED]');
      expect(sanitized.nested.normalData).toBe('safe_text');
      expect(sanitized.customerPhone).toBe('2547****5678');
      expect(sanitized.userId).toBe(104);
      expect(sanitized.email).toBe('admin@essence.co.ke');
    });
  });

  describe('Log File Writing & Daily Rotation', () => {
    it('should write INFO AUTH log to application.log and authentication.log without throwing', async () => {
      service.info('AUTH', 'User logged in successfully', {
        userId: 104,
        email: 'cashier01@essence.co.ke',
        password: 'should_be_stripped',
      });

      // Wait a moment for queue flush
      await new Promise((resolve) => setTimeout(resolve, 150));

      const appLogPath = path.join(testStorageDir, 'application.log');
      const authLogPath = path.join(testStorageDir, 'authentication.log');

      expect(fs.existsSync(appLogPath)).toBe(true);
      expect(fs.existsSync(authLogPath)).toBe(true);

      const appContent = fs.readFileSync(appLogPath, 'utf8');
      expect(appContent).toContain('INFO | AUTH | User logged in successfully');
      expect(appContent).toContain('userId=104');
      expect(appContent).toContain('password=[REDACTED]');
      expect(appContent).not.toContain('should_be_stripped');
    });

    it('should write PAYMENT log to payments.log with masked phone', async () => {
      service.info('PAYMENT', 'M-Pesa payment received', {
        amount: 1500,
        receipt: 'ABC123XYZ',
        phone: '254712345678',
      });

      await new Promise((resolve) => setTimeout(resolve, 150));

      const payLogPath = path.join(testStorageDir, 'payments.log');
      expect(fs.existsSync(payLogPath)).toBe(true);

      const content = fs.readFileSync(payLogPath, 'utf8');
      expect(content).toContain('INFO | PAYMENT | M-Pesa payment received');
      expect(content).toContain('amount=1500');
      expect(content).toContain('receipt=ABC123XYZ');
      expect(content).toContain('phone=2547****5678');
      expect(content).not.toContain('254712345678');
    });

    it('should write ERROR log to errors.log with stack trace', async () => {
      service.error(
        'SYSTEM',
        'Database connection timeout',
        { attempt: 3 },
        'Error: Connection lost\n    at PrismaClient.connect (prisma.js:10:5)',
      );

      await new Promise((resolve) => setTimeout(resolve, 150));

      const errLogPath = path.join(testStorageDir, 'errors.log');
      expect(fs.existsSync(errLogPath)).toBe(true);

      const content = fs.readFileSync(errLogPath, 'utf8');
      expect(content).toContain('ERROR | SYSTEM | Database connection timeout');
      expect(content).toContain('Stack: Error: Connection lost');
      expect(content).toContain('at PrismaClient.connect');
    });

    it('should safely handle concurrent writes from multiple requests without corrupting data', async () => {
      const promises: Promise<void>[] = [];
      const numWrites = 50;

      for (let i = 0; i < numWrites; i++) {
        service.info('API', `Concurrent request test ${i}`, { index: i });
      }

      await new Promise((resolve) => setTimeout(resolve, 300));

      const appLogPath = path.join(testStorageDir, 'application.log');
      const content = fs.readFileSync(appLogPath, 'utf8');

      for (let i = 0; i < numWrites; i++) {
        expect(content).toContain(`Concurrent request test ${i}`);
      }
    });
  });

  describe('Admin Safe Log Reader & Path Traversal Prevention', () => {
    it('should reject path traversal attempts when reading logs', async () => {
      await expect(
        service.readLogs({ file: '../../package.json' as any }),
      ).rejects.toThrow('Invalid log file name requested.');

      await expect(
        service.readLogs({ file: '/etc/passwd' as any }),
      ).rejects.toThrow('Invalid log file name requested.');

      await expect(
        service.readLogs({ file: 'malicious.txt' as any }),
      ).rejects.toThrow('Invalid log file name requested.');
    });

    it('should read, parse, filter and paginate logs safely', async () => {
      const result = await service.readLogs({
        file: 'application.log',
        limit: 10,
        page: 1,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.meta).toBeDefined();
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.total).toBeGreaterThan(0);

      // Verify log structure matches UI requirements
      if (result.data.length > 0) {
        const sample = result.data[0];
        expect(sample.level).toBeDefined();
        expect(sample.category).toBeDefined();
        expect(sample.message).toBeDefined();
        expect(sample.timestamp).toBeDefined();
      }
    });

    it('should filter logs by category and level', async () => {
      const resultAuth = await service.readLogs({
        file: 'application.log',
        category: 'AUTH',
      });

      for (const item of resultAuth.data) {
        expect(item.category).toBe('AUTH');
      }

      const resultErr = await service.readLogs({
        file: 'application.log',
        level: 'ERROR',
      });

      for (const item of resultErr.data) {
        expect(item.level).toBe('ERROR');
      }
    });

    it('should list available .log files safely', () => {
      const files = service.getAvailableLogFiles();
      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBeGreaterThan(0);
      expect(files.some((f) => f.fileName === 'application.log')).toBe(true);
      expect(files.every((f) => f.fileName.endsWith('.log'))).toBe(true);
    });
  });
});
