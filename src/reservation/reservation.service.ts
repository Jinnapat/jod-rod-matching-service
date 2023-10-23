import { Injectable, NotFoundException } from '@nestjs/common';
import { MongoClient, Collection, ObjectId } from 'mongodb';

@Injectable()
export class ReservationService {
  private reservationCollection: Collection;

  async initialize() {
    const client = new MongoClient('mongodb://root:example@localhost:27017');
    await client.connect();
    const db = client.db('match-service');
    this.reservationCollection = db.collection('reservations');
    console.log('connected to reservation db');
  }

  getReservations() {}

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
