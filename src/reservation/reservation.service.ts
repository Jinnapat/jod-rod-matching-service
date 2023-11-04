import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { MongoClient, Collection, ObjectId } from 'mongodb';
import { ConfigService } from '@nestjs/config';
import { Channel, connect } from 'amqplib';

@Injectable()
export class ReservationService {
  private reservationCollection: Collection;
  private channel: Channel;

  constructor(private readonly configService: ConfigService) {}

  async initialize() {
    const client = new MongoClient(this.configService.get('MONGO_URL'));
    await client.connect();
    const db = client.db('match-service');
    this.reservationCollection = db.collection('reservations');
    console.log('connected to reservation db');

    const conn = await connect(this.configService.get('AMQP_URL'));
    console.log('connected to rabbitmq');
    this.channel = await conn.createChannel();
  }

  async getReservations() {
    const getAllResult = await this.reservationCollection.find().toArray();
    return getAllResult.map((reservation) => this.renameIdField(reservation));
  }

  async getReservationsByParkingLotId(parkingLotId: string) {
    await this.checkParkingLotExist(parkingLotId);
    const getManyResult = await this.reservationCollection
      .find({
        parkingLotId,
      })
      .toArray();
    if (getManyResult.length == 0)
      throw new NotFoundException('no reservation with that parking lot');
    return getManyResult.map((reservation) => this.renameIdField(reservation));
  }

  async getReservationById(id: string) {
    const getOneResult = await this.getAtLeastOne(id);
    return this.renameIdField(getOneResult);
  }

  async reserve(userId: number, parkingLotId: string) {
    await this.checkAvailability(parkingLotId);

    const msg = JSON.stringify(userId);
    await this.channel.assertQueue(parkingLotId, {
      durable: false,
    });
    this.channel.sendToQueue(parkingLotId, Buffer.from(msg));

    const insertResult = await this.reservationCollection.insertOne({
      userId,
      parkingLotId,
      confirmed: false,
    });

    return insertResult.insertedId;
  }

  async confirm(reservationId: string) {
    const updateResult = await this.reservationCollection.updateOne(
      {
        _id: new ObjectId(reservationId),
      },
      {
        confirmed: true,
      },
    );
    if (updateResult.matchedCount == 0)
      throw new NotFoundException('No reservation with that id');
  }

  private async checkParkingLotExist(parkingLotId: string) {
    const findParkingLotResult = await fetch(
      this.configService.get('PARKING_LOT_SERVICE_URL') +
        '/getParkingSpace/' +
        parkingLotId,
    );

    if (findParkingLotResult.status != 200)
      throw new NotFoundException(
        'Cant get information about that parking lot',
      );

    return findParkingLotResult;
  }

  private async checkAvailability(parkingLotId: string) {
    const findParkingLotResult = await this.checkParkingLotExist(parkingLotId);

    const responseBody = await new Response(findParkingLotResult.body).json();
    if (!responseBody.available) throw new InternalServerErrorException();
    if ((responseBody.available = 0))
      throw new ForbiddenException('the parking lot is full.');
  }

  private renameIdField(reservation) {
    return {
      id: reservation._id,
      userId: reservation.userId,
      parkingLotId: reservation.parkingLotId,
      confirmed: reservation.confirmed,
    };
  }

  private async getAtLeastOne(id: string) {
    const getOneResult = await this.reservationCollection.findOne({
      _id: new ObjectId(id),
    });
    if (!getOneResult)
      throw new NotFoundException('no reservation with that id');
    return getOneResult;
  }
}
