import { Test, TestingModule } from '@nestjs/testing';
import { AdminResolver } from './admin.resolver';
import { AdminService } from './services/admin.service';

describe('AdminResolver', () => {
  let resolver: AdminResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminResolver,
        {
          provide: AdminService,
          useValue: {}, // Mock service
        },
      ],
    }).compile();

    resolver = module.get<AdminResolver>(AdminResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
