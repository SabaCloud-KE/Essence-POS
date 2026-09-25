import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('EssencePOS-Bootstrap');
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = process.env.CORS_ORIGIN
    ? [process.env.CORS_ORIGIN, 'http://localhost:3000', 'http://127.0.0.1:3000']
    : '*';

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const port = parseInt(process.env.PORT || '4000', 10);
  await app.listen(port, '0.0.0.0');

  logger.log(`=======================================================`);
  logger.log(`✨ Essence Hair & Beauty Salon POS API is running ✨`);
  logger.log(`🚀 Server listening on: http://localhost:${port}/api`);
  logger.log(`💳 Safaricom Daraja Mode: ${process.env.MPESA_ENVIRONMENT || 'sandbox'}`);
  logger.log(`=======================================================`);
}

bootstrap();
