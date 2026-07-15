import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { In, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '@/common/filters/all-exceptions.filter';
import { ResponseInterceptor } from '@/common/interceptors/response.interceptor';
import { MAILER_PORT } from '@/modules/iam/auth/services/mailer.port';
import { CANDIDATE_PROFILE_REPOSITORY } from '@/modules/candidates/repositories/candidate-profile.repository.interface';
import { User } from '@/modules/iam/users/entities/user.entity';

/**
 * DoD: rollback verificado ante fallo. Se fuerza un error al guardar el perfil
 * del candidato (dentro de la transacción); el usuario NO debe quedar persistido.
 */
describe('Register rollback (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;

  const sendEmailVerification = jest.fn().mockResolvedValue(undefined);
  const stamp = Date.now();
  const email = `m5-rollback-${stamp}@test.io`;

  // Doble que pasa el pre-check pero falla al guardar (dentro de la transacción).
  const failingProfileRepo = {
    existsByDocumentNumber: jest.fn().mockResolvedValue(false),
    save: jest.fn().mockRejectedValue(new Error('fallo forzado al guardar')),
  };

  const req = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MAILER_PORT)
      .useValue({ sendEmailVerification, sendPasswordReset: jest.fn() })
      .overrideProvider(CANDIDATE_PROFILE_REPOSITORY)
      .useValue(failingProfileRepo)
      .compile();

    app = moduleRef.createNestApplication();
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
    await app.init();

    userRepo = moduleRef.get(getRepositoryToken(User));
    await userRepo.delete({ email: In([email]) });
  });

  afterAll(async () => {
    if (userRepo) await userRepo.delete({ email: In([email]) });
    await app?.close();
  });

  it('revierte todo si falla un paso de la transacción', async () => {
    await req()
      .post('/api/v1/auth/register')
      .send({
        accountType: 'candidate',
        email,
        password: 'Secreta#123',
        candidate: {
          firstName: 'Ana',
          lastName: 'García',
          documentType: 'INE',
          documentNumber: `INE-${stamp}`,
          birthDate: '1990-05-20',
          state: 'JAL',
          municipality: 'Zapopan',
        },
      })
      .expect(500);

    expect(failingProfileRepo.save).toHaveBeenCalled();
    // Rollback: el usuario no quedó persistido.
    const user = await userRepo.findOne({ where: { email } });
    expect(user).toBeNull();
    // La verificación (post-commit) no se disparó.
    expect(sendEmailVerification).not.toHaveBeenCalled();
  });
});
