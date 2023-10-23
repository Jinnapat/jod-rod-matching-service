import { Test, TestingModule } from '@nestjs/testing';
import { ParkingSpaceService } from './parking-space.service';

describe('ParkingSpaceService', () => {
  let service: ParkingSpaceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ParkingSpaceService],
    }).compile();

    service = module.get<ParkingSpaceService>(ParkingSpaceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
