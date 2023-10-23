import { Injectable, NotFoundException } from '@nestjs/common';
import { MongoClient, Collection, ObjectId } from 'mongodb';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ReservationService {
  private reservationCollection: Collection;

  constructor(private readonly configService: ConfigService) {}

  async initialize() {
    const client = new MongoClient(this.configService.get('MONGO_URL'));
    await client.connect();
    const db = client.db('match-service');
    this.reservationCollection = db.collection('reservations');
    console.log('connected to reservation db');
  }

  async reserve(userId: number) {
    this.reservationCollection.insertOne({
      userId,
      reservedTime: Date.now(),
    });
  }

  async updateReservationStatus(reservationId: string, status: boolean) {
    const updateResult = await this.reservationCollection.updateOne(
      { _id: new ObjectId(reservationId) },
      { $set: { approved: status } },
    );
    if (updateResult.matchedCount == 0)
      throw new NotFoundException('No reservation with that id');
  }
}
