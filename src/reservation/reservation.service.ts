import {
  ForbiddenException,
  Injectable,
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
    const getAllResult = await this.reservationCollection
      .find({
        lateAt: { $gt: Date.now() },
        confirmed: false,
        left: false,
      })
      .toArray();
    return await this.addUsernameField(getAllResult);
  }

  async getReservationsByParkingLotId(parkingLotId: string) {
    await this.checkParkingLotExist(parkingLotId);
    const getAllResult = await this.reservationCollection
      .find({
        parkingLotId: parkingLotId,
        lateAt: { $gt: Date.now() },
        confirmed: false,
        left: false,
      })
      .toArray();
    return await this.addUsernameField(getAllResult);
  }

  async getReservationById(id: string) {
    const getOneResult = await this.getAtLeastOne(id);
    return this.renameIdField(getOneResult);
  }

  async reserve(userIdString: string, parkingLotId: string) {
    const userId = parseInt(userIdString);

    await this.checkUserExist(userId);
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
      lateAt:
        Date.now() +
        parseInt(this.configService.get('RESERVAtion_DURATION_MS')),
      left: false,
    });

    return insertResult.insertedId;
  }

  async confirm(reservationId: string) {
    const updateResult = await this.reservationCollection.updateOne(
      {
        _id: new ObjectId(reservationId),
      },
      {
        $set: { confirmed: true },
      },
    );
    if (updateResult.matchedCount == 0)
      throw new NotFoundException('No reservation with that id');
  }

  async countActiveReservations(parkingLotId: string) {
    const findResult = await this.reservationCollection
      .find({
        parkingLotId: parkingLotId,
        $or: [
          {
            lateAt: { $gt: Date.now() },
            confirmed: false,
          },
          {
            confirmed: true,
            left: false,
          },
        ],
      })
      .toArray();
    return findResult.length;
  }

  async getAciveReservationsByUser(userIdString: string) {
    const userId = parseInt(userIdString);

    await this.checkUserExist(userId);

    const findResult = await this.reservationCollection
      .find({ userId, lateAt: { $gt: Date.now() }, confirmed: false })
      .toArray();
    return findResult.map((reservation) => this.renameIdField(reservation));
  }

  private async checkUserExist(userId: number) {
    const findUserResult = await fetch(
      this.configService.get('USER_SERVICE_URL') + '/getUser/' + userId,
    );

    if (findUserResult.status != 200)
      throw new NotFoundException('Cant get information about that user');
    return await new Response(findUserResult.body).json();
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
    if (responseBody.available == 0)
      throw new ForbiddenException('the parking lot is full.');
  }

  private async addUsernameField(reservations) {
    return await Promise.all(
      reservations.map(async (reservation) => {
        const userInfo = await this.checkUserExist(
          parseInt(reservation.userId),
        );
        return {
          id: reservation._id,
          userId: reservation.userId,
          username: userInfo.username,
          parkingLotId: reservation.parkingLotId,
          confirmed: reservation.confirmed,
          lateAt: reservation.lateAt,
          left: reservation.left,
        };
      }),
    );
  }

  private renameIdField(reservation) {
    return {
      id: reservation._id,
      userId: reservation.userId,
      parkingLotId: reservation.parkingLotId,
      confirmed: reservation.confirmed,
      lateAt: reservation.lateAt,
      left: reservation.left,
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
