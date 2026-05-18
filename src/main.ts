import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for cross-origin requests from the frontend
  app.enableCors();

  // Enforce validation globally using class-validator and class-transformer
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strips out properties not defined in the DTO
      transform: true, // Automatically transforms payloads to be objects typed according to their DTO classes
      forbidNonWhitelisted: true, // Throws an error if non-whitelisted properties are present
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();