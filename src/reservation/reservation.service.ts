import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MongoClient, Collection, ObjectId } from 'mongodb';
import { ConfigService } from '@nestjs/config';
import { Channel, connect } from 'amqplib';

interface Reservation {
  _id: string;
  userId: number;
  parkingLotId: string;
  confirmed: boolean;
  lateAt: number;
  left: boolean;
}

interface ParkingLot {
  id: string;
  lat: number;
  lng: number;
  name: string;
  totalParking: number;
  available: number;
}

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
      .find<Reservation>({
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
      .find<Reservation>({
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
    return this.addParkingSpaceFields(getOneResult);
  }

  async reserve(userIdString: string, parkingLotId: string) {
    const userId = parseInt(userIdString);

    await this.checkUserExist(userId);
    await this.checkAvailability(parkingLotId);

    await this.addMessageToQueue(parkingLotId, userId);

    const insertResult = await this.reservationCollection.insertOne({
      userId,
      parkingLotId,
      confirmed: false,
      lateAt:
        Date.now() +
        parseInt(this.configService.get('RESERVATION_DURATION_MS')),
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
    const getReservationResult = await this.getReservationById(reservationId);
    const msg = {
      ...getReservationResult,
      status: 'CONFIRMED',
    };
    await this.addMessageToQueue(
      JSON.stringify(getReservationResult.userId),
      msg,
    );
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

  async getActiveReservationsByUser(userIdString: string) {
    const userId = parseInt(userIdString);

    await this.checkUserExist(userId);

    const findResult = await this.reservationCollection
      .find<Reservation>({
        userId,
        lateAt: { $gt: Date.now() },
        confirmed: false,
      })
      .toArray();
    return findResult.map((reservation) =>
      this.addParkingSpaceFields(reservation),
    );
  }

  private async checkUserExist(userId: number) {
    const findUserResult = await fetch(
      this.configService.get('USER_SERVICE_URL') + '/getUser/' + userId,
    );

    if (findUserResult.status != 200)
      throw new NotFoundException('Cant get information about that user');
    return await new Response(findUserResult.body).json();
  }

  private async checkParkingLotExist(
    parkingLotId: string,
  ): Promise<ParkingLot> {
    const findParkingLotResult = await fetch(
      this.configService.get('PARKING_LOT_SERVICE_URL') +
        '/getParkingSpace/' +
        parkingLotId,
    );

    if (findParkingLotResult.status != 200)
      throw new NotFoundException(
        'Cant get information about that parking lot',
      );

    return await new Response(findParkingLotResult.body).json();
  }

  private async checkAvailability(parkingLotId: string) {
    const findParkingLotResult = await this.checkParkingLotExist(parkingLotId);

    if (findParkingLotResult.available == 0)
      throw new ForbiddenException('the parking lot is full.');
  }

  private async addUsernameField(reservations: Reservation[]) {
    return await Promise.all(
      reservations.map(async (reservation) => {
        const userInfo = await this.checkUserExist(reservation.userId);
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

  private async addParkingSpaceFields(reservation: Reservation) {
    const getParkingLotResult = await this.checkParkingLotExist(
      reservation.parkingLotId,
    );
    return {
      id: reservation._id,
      userId: reservation.userId,
      parkingLotId: reservation.parkingLotId,
      parkingLotName: getParkingLotResult.name,
      confirmed: reservation.confirmed,
      lateAt: reservation.lateAt,
      left: reservation.left,
    };
  }

  private async getAtLeastOne(id: string) {
    const getOneResult = await this.reservationCollection.findOne<Reservation>({
      _id: new ObjectId(id),
    });
    if (!getOneResult)
      throw new NotFoundException('no reservation with that id');
    return getOneResult;
  }

  private async addMessageToQueue(queueName: string, message: any) {
    const msg = JSON.stringify(message);
    await this.channel.assertQueue(queueName, {
      durable: false,
    });
    this.channel.sendToQueue(queueName, Buffer.from(msg));
  }
}
