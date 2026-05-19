import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './services/admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../common/services/password.service';

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: {} },
        { provide: PasswordService, useValue: {} },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
