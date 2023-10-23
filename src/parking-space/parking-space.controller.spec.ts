import { Test, TestingModule } from '@nestjs/testing';
import { ParkingSpaceController } from './parking-space.controller';

describe('ParkingSpaceController', () => {
  let controller: ParkingSpaceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ParkingSpaceController],
    }).compile();

    controller = module.get<ParkingSpaceController>(ParkingSpaceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
