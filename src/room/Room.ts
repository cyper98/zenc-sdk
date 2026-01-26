import EventEmitter from 'eventemitter3';
import { SignalingClient } from '../connection/SignalingClient';
import { PeerConnection } from '../connection/PeerConnection';
import { Participant, LocalParticipant } from '../participant/Participant';
import { LocalTrack, RemoteTrack, RemoteVideoTrack, RemoteAudioTrack } from '../track/Track';
import {
  ParticipantState,
  TrackLimitError,
  ParticipantOnHoldError
} from '../types';
import type {
  RoomInfo,
  ParticipantInfo,
  TrackInfo,
  PublishTrackRequest,
  PublishTrackResponse,
  SubscribeTrackRequest,
  SubscribeTrackResponse,
  ICECandidateMessage
} from '../types';

export class Room extends EventEmitter {
  public id: string;
  public name: string;
  public participants: Map<string, Participant>;
  public localParticipant?: LocalParticipant;
  public state: ParticipantState;
  
  private signalingClient: SignalingClient;
  private publisherPC?: PeerConnection;
  private subscriberPCs: Map<string, PeerConnection> = new Map();
  private pendingIceCandidates: Map<string, RTCIceCandidateInit[]> = new Map();

  constructor(
    roomInfo: RoomInfo,
    participantInfo: ParticipantInfo,
    signalingClient: SignalingClient
  ) {
    super();
    this.id = roomInfo.id;
    this.name = roomInfo.name;
    this.participants = new Map();
    this.signalingClient = signalingClient;
    this.state = ParticipantState.ACTIVE;

    // Create local participant
    this.localParticipant = new LocalParticipant(participantInfo);

    // Setup signaling handlers
    this.setupSignalingHandlers();
  }

  private setupSignalingHandlers(): void {
    this.signalingClient.on('participant.joined', (data: ParticipantInfo) => {
      const participant = new Participant(data);
      this.participants.set(participant.id, participant);
      this.emit('participantJoined', participant);
    });

    this.signalingClient.on('participant.left', (data: { participantId: string }) => {
      const participant = this.participants.get(data.participantId);
      if (participant) {
        this.participants.delete(data.participantId);
        this.emit('participantLeft', participant);
      }
    });

    this.signalingClient.on('track.published', (data: TrackInfo) => {
      const participant = this.participants.get(data.participantId);
      if (participant) {
        const track = data.kind === 'video'
          ? new RemoteVideoTrack(data.id, data.source)
          : new RemoteAudioTrack(data.id, data.source);
        participant.addTrack(track);
      }
    });

    this.signalingClient.on('track.unpublished', (data: { trackId: string; participantId: string }) => {
      const participant = this.participants.get(data.participantId);
      if (participant) {
        participant.removeTrack(data.trackId);
      }
    });

    this.signalingClient.on('track.subscribed', async (data: SubscribeTrackResponse) => {
      // Handle SDP answer for subscription
      const pc = this.subscriberPCs.get(data.sdpOffer); // Use a better key in production
      if (pc) {
        await pc.setRemoteDescription({ type: 'offer', sdp: data.sdpOffer });
        const answer = await pc.createAnswer();
        
        this.signalingClient.send({
          type: 'track.subscribe.answer',
          data: { sdp: answer.sdp }
        });
      }
    });

    this.signalingClient.on('ice.candidate', async (data: ICECandidateMessage) => {
      const trackId = data.trackId;
      if (trackId) {
        const pc = this.subscriberPCs.get(trackId);
        if (pc && pc.getConnectionState() !== 'closed') {
          await pc.addIceCandidate(data.candidate);
        } else {
          // Store for later
          if (!this.pendingIceCandidates.has(trackId)) {
            this.pendingIceCandidates.set(trackId, []);
          }
          this.pendingIceCandidates.get(trackId)!.push(data.candidate);
        }
      }
    });
  }

  async publishTrack(track: LocalTrack): Promise<void> {
    if (!this.localParticipant) {
      throw new Error('Not joined to room');
    }

    // Check if participant is on hold
    if (this.isOnHold) {
      throw new ParticipantOnHoldError();
    }

    // Create publisher peer connection if needed
    if (!this.publisherPC) {
      this.publisherPC = new PeerConnection({
        onIceCandidate: (candidate) => {
          this.signalingClient.send({
            type: 'ice.candidate',
            data: { candidate, trackId: track.id }
          });
        }
      });
    }

    // Add track to peer connection
    const stream = new MediaStream([track.mediaStreamTrack]);
    await this.publisherPC.addTrack(track.mediaStreamTrack, stream);

    // Create offer
    const offer = await this.publisherPC.createOffer();

    // Send publish request
    const request: PublishTrackRequest = {
      participantId: this.localParticipant.id,
      track: {
        id: track.id,
        kind: track.kind,
        source: track.source,
        status: track.status,
        participantId: this.localParticipant.id
      },
      sdpOffer: offer.sdp!
    };

    return new Promise((resolve, reject) => {
      this.signalingClient.once('track.published.response', async (response: PublishTrackResponse | any) => {
        try {
          // Check for error responses
          if (response.error) {
            if (response.error === 'participant_on_hold' || response.code === 'MAX_TRACKS_REACHED') {
              throw new TrackLimitError(response.message || 'Track limit exceeded');
            }
            throw new Error(response.message || response.error);
          }

          await this.publisherPC!.setRemoteDescription({ type: 'answer', sdp: response.sdpAnswer });
          this.localParticipant!.addPublishedTrack(track);
          this.emit('trackPublished', track);
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      this.signalingClient.send({
        type: 'track.publish',
        data: request
      });
    });
  }

  async unpublishTrack(track: LocalTrack): Promise<void> {
    if (!this.localParticipant) {
      throw new Error('Not joined to room');
    }

    this.signalingClient.send({
      type: 'track.unpublish',
      data: { trackId: track.id }
    });

    this.localParticipant.removePublishedTrack(track.id);
    track.stop();
    this.emit('trackUnpublished', track);
  }

  async subscribe(trackId: string): Promise<RemoteTrack> {
    if (!this.localParticipant) {
      throw new Error('Not joined to room');
    }

    // Create subscriber peer connection
    const pc = new PeerConnection({
      onIceCandidate: (candidate) => {
        this.signalingClient.send({
          type: 'ice.candidate',
          data: { candidate, trackId }
        });
      },
      onTrack: (mediaTrack, _streams) => {
        // Find the remote track and attach media stream track
        for (const participant of this.participants.values()) {
          const remoteTrack = participant.getTrack(trackId);
          if (remoteTrack) {
            remoteTrack.setMediaStreamTrack(mediaTrack);
            this.emit('trackSubscribed', remoteTrack, participant);
          }
        }
      }
    });

    this.subscriberPCs.set(trackId, pc);

    // Send subscribe request
    const request: SubscribeTrackRequest = {
      participantId: this.localParticipant.id,
      trackId
    };

    this.signalingClient.send({
      type: 'track.subscribe',
      data: request
    });

    // Find and return the track
    for (const participant of this.participants.values()) {
      const track = participant.getTrack(trackId);
      if (track) {
        // Add pending ICE candidates
        const pending = this.pendingIceCandidates.get(trackId);
        if (pending) {
          for (const candidate of pending) {
            await pc.addIceCandidate(candidate);
          }
          this.pendingIceCandidates.delete(trackId);
        }
        
        return track;
      }
    }

    throw new Error(`Track ${trackId} not found`);
  }

  async unsubscribe(trackId: string): Promise<void> {
    this.signalingClient.send({
      type: 'track.unsubscribe',
      data: { trackId }
    });

    const pc = this.subscriberPCs.get(trackId);
    if (pc) {
      pc.close();
      this.subscriberPCs.delete(trackId);
    }

    this.emit('trackUnsubscribed', trackId);
  }

  async leave(): Promise<void> {
    // Unpublish all tracks
    if (this.localParticipant) {
      for (const track of this.localParticipant.publishedTracks.values()) {
        track.stop();
      }
    }

    // Close all peer connections
    this.publisherPC?.close();
    this.subscriberPCs.forEach((pc) => pc.close());
    this.subscriberPCs.clear();

    // Send leave request
    this.signalingClient.send({
      type: 'room.leave',
      data: { roomId: this.id }
    });

    this.emit('left');
  }

  async hold(): Promise<void> {
    if (!this.localParticipant) {
      throw new Error('Not connected to room');
    }

    // Pause all local tracks
    for (const track of this.localParticipant.publishedTracks.values()) {
      await track.hold();
    }

    // Send hold message to server
    this.signalingClient.send({
      type: 'room.hold',
      data: {
        roomId: this.id,
        participantId: this.localParticipant.id
      }
    });

    this.state = ParticipantState.ON_HOLD;
    this.emit('roomHeld');
  }

  async resume(): Promise<void> {
    if (!this.localParticipant) {
      throw new Error('Not connected to room');
    }

    // Send resume message to server
    this.signalingClient.send({
      type: 'room.resume',
      data: {
        roomId: this.id,
        participantId: this.localParticipant.id
      }
    });

    // Resume all tracks
    for (const track of this.localParticipant.publishedTracks.values()) {
      await track.resume();
    }

    this.state = ParticipantState.ACTIVE;
    this.emit('roomResumed');
  }

  get isOnHold(): boolean {
    return this.state === ParticipantState.ON_HOLD;
  }
}
