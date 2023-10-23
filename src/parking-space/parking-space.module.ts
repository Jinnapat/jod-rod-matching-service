import { Module } from '@nestjs/common';
import { ParkingSpaceService } from './parking-space.service';
import { ParkingSpaceController } from './parking-space.controller';

@Module({
  providers: [ParkingSpaceService],
  controllers: [ParkingSpaceController],
})
export class ParkingSpaceModule {}
