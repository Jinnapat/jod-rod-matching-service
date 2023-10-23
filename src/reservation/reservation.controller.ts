import { Controller, Post, Param, Body } from '@nestjs/common';
import { ReservationService } from './reservation.service';

@Controller('reservation')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {
    this.reservationService.initialize();
  }

  @Post('reserve')
  async reserveHandler(@Body('userId') userId) {
    return await this.reservationService.reserve(userId);
  }

  @Post('confirm/:id')
  async confirmReservationHandler(@Param('id') id) {
    return await this.reservationService.updateReservationStatus(id, true);
  }

  @Post('reject/:id')
  async rejectReservationHandler(@Param('id') id) {
    return await this.reservationService.updateReservationStatus(id, false);
  }
}
