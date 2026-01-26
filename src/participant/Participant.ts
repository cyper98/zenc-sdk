import EventEmitter from 'eventemitter3';
import { ConnectionQuality } from '../types';
import type {
  RoomRole,
  ParticipantInfo
} from '../types';
import { RemoteTrack } from '../track/Track';

export class Participant extends EventEmitter {
  public id: string;
  public userId: string;
  public role: RoomRole;
  public tracks: Map<string, RemoteTrack>;
  public connectionQuality: ConnectionQuality;
  public metadata?: Record<string, unknown>;
  public joinedAt: number;

  constructor(info: ParticipantInfo) {
    super();
    this.id = info.id;
    this.userId = info.userId;
    this.role = info.role;
    this.metadata = info.metadata;
    this.joinedAt = info.joinedAt;
    this.tracks = new Map();
    this.connectionQuality = ConnectionQuality.GOOD;
  }

  addTrack(track: RemoteTrack): void {
    this.tracks.set(track.id, track);
    this.emit('trackPublished', track);
  }

  removeTrack(trackId: string): void {
    const track = this.tracks.get(trackId);
    if (track) {
      this.tracks.delete(trackId);
      this.emit('trackUnpublished', track);
    }
  }

  getTrack(trackId: string): RemoteTrack | undefined {
    return this.tracks.get(trackId);
  }

  updateConnectionQuality(quality: ConnectionQuality): void {
    if (this.connectionQuality !== quality) {
      this.connectionQuality = quality;
      this.emit('connectionQualityChanged', quality);
    }
  }
}

export class LocalParticipant extends Participant {
  public publishedTracks: Map<string, any>;

  constructor(info: ParticipantInfo) {
    super(info);
    this.publishedTracks = new Map();
  }

  addPublishedTrack(track: any): void {
    this.publishedTracks.set(track.id, track);
    this.emit('trackPublished', track);
  }

  removePublishedTrack(trackId: string): void {
    const track = this.publishedTracks.get(trackId);
    if (track) {
      this.publishedTracks.delete(trackId);
      this.emit('trackUnpublished', track);
    }
  }
}
