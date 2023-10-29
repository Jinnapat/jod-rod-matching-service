import { Injectable } from '@nestjs/common';
import { MongoClient, Collection } from 'mongodb';
import { ConfigService } from '@nestjs/config';
import { Channel, connect } from 'amqplib';

@Injectable()
export class ReservationService {
  private confirmedReservationCollection: Collection;
  private channel: Channel;

  constructor(private readonly configService: ConfigService) {}

  async initialize() {
    const client = new MongoClient(this.configService.get('MONGO_URL'));
    await client.connect();
    const db = client.db('match-service');
    this.confirmedReservationCollection = db.collection(
      'confirmedReservations',
    );
    console.log('connected to reservation db');

    const conn = await connect(this.configService.get('CLOUDAMQP_URL'));
    this.channel = await conn.createChannel();
  }

  async reserve(userId: number, parkingLotId: string) {
    const msg = JSON.stringify(userId);
    await this.channel.assertQueue(parkingLotId, {
      durable: false,
    });
    this.channel.sendToQueue(parkingLotId, Buffer.from(msg));
  }

  async confirm(userId: number, parkingLotId: string) {
    await this.confirmedReservationCollection.insertOne({
      userId,
      parkingLotId,
    });
  }
}
