import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));

  // Detrás de Apache/Passenger (cPanel): confía en el proxy para obtener la IP
  // real del cliente (usada en la auditoría).
  const expressApp = app.getHttpAdapter().getInstance() as {
    set: (key: string, value: unknown) => void;
  };
  expressApp.set('trust proxy', 1);

  // CORS: en producción se restringe a los orígenes de CORS_ORIGIN
  // (coma-separado, p. ej. "https://tudominio.com"). Sin la variable, permisivo.
  const corsOrigin = process.env.CORS_ORIGIN?.trim();
  app.enableCors({
    origin: corsOrigin
      ? corsOrigin.split(',').map((origin) => origin.trim())
      : true,
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Impulso Jobs API')
    .setDescription('API del portal de empleabilidad Impulso Jobs.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, { jsonDocumentUrl: 'docs-json' });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
