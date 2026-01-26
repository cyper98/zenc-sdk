import EventEmitter from 'eventemitter3';

export interface PeerConnectionOptions {
  iceServers?: RTCIceServer[];
  onTrack?: (track: MediaStreamTrack, streams: MediaStream[]) => void;
  onIceCandidate?: (candidate: RTCIceCandidate) => void;
}

export class PeerConnection extends EventEmitter {
  private pc: RTCPeerConnection;
  private localTracks: Map<string, MediaStreamTrack> = new Map();

  constructor(options: PeerConnectionOptions = {}) {
    super();

    const config: RTCConfiguration = {
      iceServers: options.iceServers || [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    };

    this.pc = new RTCPeerConnection(config);

    // Handle ICE candidates
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.emit('icecandidate', event.candidate);
        options.onIceCandidate?.(event.candidate);
      }
    };

    // Handle incoming tracks
    this.pc.ontrack = (event) => {
      this.emit('track', event.track, event.streams);
      options.onTrack?.(event.track, [...event.streams]);
    };

    // Handle connection state changes
    this.pc.onconnectionstatechange = () => {
      this.emit('connectionstatechange', this.pc.connectionState);
    };

    // Handle ICE connection state changes
    this.pc.oniceconnectionstatechange = () => {
      this.emit('iceconnectionstatechange', this.pc.iceConnectionState);
    };
  }

  async addTrack(track: MediaStreamTrack, stream: MediaStream): Promise<RTCRtpSender> {
    const sender = this.pc.addTrack(track, stream);
    this.localTracks.set(track.id, track);
    return sender;
  }

  removeTrack(sender: RTCRtpSender): void {
    this.pc.removeTrack(sender);
    if (sender.track) {
      this.localTracks.delete(sender.track.id);
    }
  }

  async createOffer(options?: RTCOfferOptions): Promise<RTCSessionDescriptionInit> {
    const offer = await this.pc.createOffer(options);
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  async createAnswer(options?: RTCAnswerOptions): Promise<RTCSessionDescriptionInit> {
    const answer = await this.pc.createAnswer(options);
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  async setRemoteDescription(sdp: RTCSessionDescriptionInit): Promise<void> {
    await this.pc.setRemoteDescription(sdp);
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    await this.pc.addIceCandidate(candidate);
  }

  getConnectionState(): RTCPeerConnectionState {
    return this.pc.connectionState;
  }

  getStats(): Promise<RTCStatsReport> {
    return this.pc.getStats();
  }

  close(): void {
    this.localTracks.clear();
    this.pc.close();
    this.emit('closed');
  }
}
