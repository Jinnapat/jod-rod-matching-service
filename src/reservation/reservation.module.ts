import { Module } from '@nestjs/common';
import { ParkingSpaceModule } from 'src/parking-space/parking-space.module';
import { ReservationService } from './reservation.service';
import { ReservationController } from './reservation.controller';

@Module({
  imports: [ParkingSpaceModule],
  providers: [ReservationService],
  controllers: [ReservationController],
})
export class ReservationModule {}
