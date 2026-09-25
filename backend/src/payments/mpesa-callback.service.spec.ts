import { Test, TestingModule } from '@nestjs/testing';
import { MpesaCallbackService } from './mpesa-callback.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventsGateway } from '../events/events.gateway';
import { PaymentStatus, SaleStatus } from '@prisma/client';

describe('MpesaCallbackService', () => {
  let service: MpesaCallbackService;
  let prisma: any;
  let eventsGateway: any;

  beforeEach(async () => {
    prisma = {
      payment: {
        findUnique: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
      },
      sale: {
        update: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    const auditService = {
      logAction: jest.fn(),
      logSystem: jest.fn(),
    };

    eventsGateway = {
      emitPaymentUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MpesaCallbackService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
        { provide: EventsGateway, useValue: eventsGateway },
      ],
    }).compile();

    service = module.get<MpesaCallbackService>(MpesaCallbackService);
  });

  it('should ignore duplicate callbacks if payment is already PAID (Idempotency)', async () => {
    prisma.payment.findUnique.mockResolvedValue({
      id: 1,
      checkoutRequestId: 'ws_CO_123',
      status: PaymentStatus.PAID,
      sale: { id: 10, receiptNumber: 'ESS-20260921-00001' },
    });

    const payload = {
      Body: {
        stkCallback: {
          MerchantRequestID: 'MER_123',
          CheckoutRequestID: 'ws_CO_123',
          ResultCode: 0,
          ResultDesc: 'Success',
        },
      },
    };

    const result = await service.processCallback(payload as any);

    expect(result.ResultCode).toBe(0);
    expect(result.ResultDesc).toContain('already successfully processed');
    expect(prisma.payment.update).not.toHaveBeenCalled();
  });

  it('should process successful callback and update payment & sale to PAID', async () => {
    prisma.payment.findUnique.mockResolvedValue({
      id: 1,
      saleId: 10,
      checkoutRequestId: 'ws_CO_456',
      status: PaymentStatus.PENDING,
      amount: 2500,
      sale: { id: 10, receiptNumber: 'ESS-20260921-00002', status: SaleStatus.PENDING },
    });

    prisma.payment.findFirst.mockResolvedValue(null);
    prisma.payment.update.mockResolvedValue({
      id: 1,
      saleId: 10,
      status: PaymentStatus.PAID,
      mpesaReceiptNumber: 'QJH9999999',
      amount: 2500,
      resultCode: 0,
      resultDescription: 'The service request is processed successfully.',
    });

    prisma.sale.update.mockResolvedValue({
      id: 10,
      receiptNumber: 'ESS-20260921-00002',
      status: SaleStatus.PAID,
    });

    const payload = {
      Body: {
        stkCallback: {
          MerchantRequestID: 'MER_456',
          CheckoutRequestID: 'ws_CO_456',
          ResultCode: 0,
          ResultDesc: 'The service request is processed successfully.',
          CallbackMetadata: {
            Item: [
              { Name: 'Amount', Value: 2500 },
              { Name: 'MpesaReceiptNumber', Value: 'QJH9999999' },
              { Name: 'TransactionDate', Value: '20260921143000' },
              { Name: 'PhoneNumber', Value: '254712345678' },
            ],
          },
        },
      },
    };

    const result = await service.processCallback(payload as any);

    expect(result.ResultCode).toBe(0);
    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({
          status: PaymentStatus.PAID,
          mpesaReceiptNumber: 'QJH9999999',
        }),
      }),
    );
    expect(prisma.sale.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { status: SaleStatus.PAID },
    });
    expect(eventsGateway.emitPaymentUpdate).toHaveBeenCalled();
  });

  it('should mark payment as CANCELLED when customer cancels STK prompt (ResultCode 1032)', async () => {
    prisma.payment.findUnique.mockResolvedValue({
      id: 2,
      saleId: 11,
      checkoutRequestId: 'ws_CO_CANCEL',
      status: PaymentStatus.PENDING,
      amount: 1500,
      sale: { id: 11, receiptNumber: 'ESS-20260921-00003', status: SaleStatus.PENDING },
    });

    prisma.payment.update.mockResolvedValue({
      id: 2,
      saleId: 11,
      status: PaymentStatus.CANCELLED,
      amount: 1500,
      resultCode: 1032,
      resultDescription: 'Request cancelled by user',
    });

    const payload = {
      Body: {
        stkCallback: {
          MerchantRequestID: 'MER_CANCEL',
          CheckoutRequestID: 'ws_CO_CANCEL',
          ResultCode: 1032,
          ResultDesc: 'Request cancelled by user',
        },
      },
    };

    const result = await service.processCallback(payload as any);

    expect(result.ResultCode).toBe(0);
    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 2 },
        data: expect.objectContaining({
          status: PaymentStatus.CANCELLED,
          resultCode: 1032,
        }),
      }),
    );
    // Sale remains PENDING so cashier can retry payment
    expect(prisma.sale.update).not.toHaveBeenCalled();
    expect(eventsGateway.emitPaymentUpdate).toHaveBeenCalled();
  });
});
