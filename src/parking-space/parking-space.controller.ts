import {
  Body,
  Controller,
  Param,
  Post,
  Get,
  Put,
  Delete,
} from '@nestjs/common';
import { ParkingSpaceService } from './parking-space.service';

@Controller('parking_space')
export class ParkingSpaceController {
  constructor(private readonly parkingSpacesService: ParkingSpaceService) {
    this.parkingSpacesService.initialize();
  }

  @Get()
  getParkingSpacesHandler() {
    return this.parkingSpacesService.getParkingSpaces();
  }

  @Post()
  createParkingSpaceHandler(
    @Body('lat') lat,
    @Body('lng') lng,
    @Body('name') name,
    @Body('totalParking') totalParking,
  ) {
    this.parkingSpacesService.createParkingSpace(lat, lng, name, totalParking);
  }

  @Put(':id')
  updateParkingSpaceHandler(
    @Param('id') id,
    @Body('lat') lat,
    @Body('lng') lng,
    @Body('name') name,
    @Body('totalParking') totalParking,
  ) {
    this.parkingSpacesService.updateParkingSpace(
      id,
      lat,
      lng,
      name,
      totalParking,
    );
  }

  @Delete(':id')
  deleteParkingSpaceHandler(@Param('id') id) {
    this.parkingSpacesService.deleteParkingSpace(id);
  }
}
