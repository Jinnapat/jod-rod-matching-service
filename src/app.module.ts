import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ReservationController } from './reservation/reservation.controller';
import { ReservationService } from './reservation/reservation.service';
import { ReservationModule } from './reservation/reservation.module';
import { ParkingSpaceModule } from './parking-space/parking-space.module';

@Module({
  imports: [ReservationModule, ParkingSpaceModule],
  controllers: [AppController, ReservationController],
  providers: [AppService, ReservationService],
})
export class AppModule {}
