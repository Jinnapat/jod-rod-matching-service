import { Controller, Post, Body } from '@nestjs/common';
import { ReservationService } from './reservation.service';

@Controller()
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {
    this.reservationService.initialize();
  }

  @Post('createReservation')
  async createReservationsHandler(
    @Body('userId') userId,
    @Body('parkingLotId') parkingLotId,
  ) {
    return await this.reservationService.reserve(userId, parkingLotId);
  }

  @Post('confirmReservation')
  async confirmReservationHandler(
    @Body('userId') userId,
    @Body('parkingLotId') parkingLotId,
  ) {
    return await this.reservationService.confirm(userId, parkingLotId);
  }
}
