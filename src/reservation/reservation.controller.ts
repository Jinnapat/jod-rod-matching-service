import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ReservationService } from './reservation.service';

@Controller()
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {
    this.reservationService.initialize();
  }

  @Get('getReservations')
  async getReservationsHandler() {
    return await this.reservationService.getReservations();
  }

  @Get('getReservations/:id')
  async getReservationsByIdHandler(@Param('id') parkingLotId) {
    return await this.reservationService.getReservationsByParkingLotId(
      parkingLotId,
    );
  }

  @Get('getReservation/:id')
  async getReservationByIdHandler(@Param('id') reservationId) {
    return await this.reservationService.getReservationById(reservationId);
  }

  @Post('createReservation')
  async createReservationsHandler(
    @Body('userId') userId,
    @Body('parkingLotId') parkingLotId,
  ) {
    return await this.reservationService.reserve(userId, parkingLotId);
  }

  @Post('confirmReservation/:id')
  async confirmReservationHandler(@Param('id') reservationId) {
    return await this.reservationService.confirm(reservationId);
  }
}
