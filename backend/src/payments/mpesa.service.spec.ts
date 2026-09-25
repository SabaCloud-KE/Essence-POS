import { Test, TestingModule } from '@nestjs/testing';
import { MpesaService } from './mpesa.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';

describe('MpesaService', () => {
  let service: MpesaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MpesaService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'MPESA_ENVIRONMENT') return 'sandbox';
              if (key === 'MPESA_SHORTCODE') return '174379';
              if (key === 'MPESA_PASSKEY') return 'test_passkey';
              return null;
            },
          },
        },
      ],
    }).compile();

    service = module.get<MpesaService>(MpesaService);
  });

  describe('formatPhoneNumber', () => {
    it('should correctly format 07XXXXXXXX to 2547XXXXXXXX', () => {
      const result = service.formatPhoneNumber('0712345678');
      expect(result).toBe('254712345678');
    });

    it('should correctly format 01XXXXXXXX (new Safaricom prefix) to 2541XXXXXXXX', () => {
      const result = service.formatPhoneNumber('0110123456');
      expect(result).toBe('254110123456');
    });

    it('should correctly format +2547XXXXXXXX to 2547XXXXXXXX', () => {
      const result = service.formatPhoneNumber('+254722000000');
      expect(result).toBe('254722000000');
    });

    it('should correctly format 9-digit input starting with 7', () => {
      const result = service.formatPhoneNumber('722123456');
      expect(result).toBe('254722123456');
    });

    it('should handle spaced numbers like "0712 345 678"', () => {
      const result = service.formatPhoneNumber('0712 345 678');
      expect(result).toBe('254712345678');
    });

    it('should reject invalid phone numbers', () => {
      expect(() => service.formatPhoneNumber('0812345678')).toThrow(BadRequestException);
      expect(() => service.formatPhoneNumber('12345')).toThrow(BadRequestException);
      expect(() => service.formatPhoneNumber('')).toThrow(BadRequestException);
    });
  });

  describe('generatePassword', () => {
    it('should generate valid base64 password from shortcode, passkey, and timestamp', () => {
      const timestamp = '20260921120000';
      const password = service.generatePassword(timestamp);
      const expected = Buffer.from(`174379test_passkey${timestamp}`).toString('base64');
      expect(password).toBe(expected);
    });
  });
});
