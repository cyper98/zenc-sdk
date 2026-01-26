import EventEmitter from 'eventemitter3';
import { TrackKind, TrackSource } from '../types';
import type {
  TrackStatus,
  VideoTrackOptions,
  AudioTrackOptions
} from '../types';

export abstract class Track extends EventEmitter {
  public id: string;
  public kind: TrackKind;
  public source: TrackSource;
  public status: TrackStatus;

  constructor(id: string, kind: TrackKind, source: TrackSource) {
    super();
    this.id = id;
    this.kind = kind;
    this.source = source;
    this.status = 'active' as TrackStatus;
  }

  abstract hold(): Promise<void>;
  abstract resume(): Promise<void>;
  abstract stop(): void;
}

export class LocalTrack extends Track {
  public mediaStreamTrack: MediaStreamTrack;

  constructor(
    id: string,
    kind: TrackKind,
    source: TrackSource,
    mediaStreamTrack: MediaStreamTrack
  ) {
    super(id, kind, source);
    this.mediaStreamTrack = mediaStreamTrack;

    // Listen to track ended event
    mediaStreamTrack.addEventListener('ended', () => {
      this.status = 'stopped' as TrackStatus;
      this.emit('ended');
    });
  }

  async hold(): Promise<void> {
    if (this.status === 'active') {
      this.mediaStreamTrack.enabled = false;
      this.status = 'paused' as TrackStatus;
      this.emit('paused');
    }
  }

  async resume(): Promise<void> {
    if (this.status === 'paused') {
      this.mediaStreamTrack.enabled = true;
      this.status = 'active' as TrackStatus;
      this.emit('resumed');
    }
  }

  stop(): void {
    this.mediaStreamTrack.stop();
    this.status = 'stopped' as TrackStatus;
    this.emit('stopped');
  }
}

export class LocalVideoTrack extends LocalTrack {
  private attachedElements: Set<HTMLVideoElement> = new Set();

  constructor(id: string, source: TrackSource, mediaStreamTrack: MediaStreamTrack) {
    super(id, TrackKind.VIDEO, source, mediaStreamTrack);
  }

  attach(element: HTMLVideoElement): void {
    if (!element.srcObject) {
      element.srcObject = new MediaStream([this.mediaStreamTrack]);
    } else {
      const stream = element.srcObject as MediaStream;
      stream.addTrack(this.mediaStreamTrack);
    }
    this.attachedElements.add(element);
  }

  detach(element?: HTMLVideoElement): void {
    if (element) {
      const stream = element.srcObject as MediaStream;
      if (stream) {
        stream.removeTrack(this.mediaStreamTrack);
        if (stream.getTracks().length === 0) {
          element.srcObject = null;
        }
      }
      this.attachedElements.delete(element);
    } else {
      // Detach from all elements
      this.attachedElements.forEach((el) => this.detach(el));
    }
  }

  setQuality(quality: string): void {
    // Quality adjustment would be implemented here
    this.emit('qualityChanged', quality);
  }
}

export class LocalAudioTrack extends LocalTrack {
  constructor(id: string, source: TrackSource, mediaStreamTrack: MediaStreamTrack) {
    super(id, TrackKind.AUDIO, source, mediaStreamTrack);
  }

  setVolume(volume: number): void {
    // Volume control implementation
    this.emit('volumeChanged', volume);
  }
}

export class RemoteTrack extends Track {
  public mediaStreamTrack?: MediaStreamTrack;
  private attachedElements: Set<HTMLMediaElement> = new Set();

  constructor(id: string, kind: TrackKind, source: TrackSource) {
    super(id, kind, source);
  }

  setMediaStreamTrack(track: MediaStreamTrack): void {
    this.mediaStreamTrack = track;
    this.emit('trackReady', track);
  }

  async hold(): Promise<void> {
    this.status = 'paused' as TrackStatus;
    this.emit('paused');
  }

  async resume(): Promise<void> {
    this.status = 'active' as TrackStatus;
    this.emit('resumed');
  }

  stop(): void {
    this.mediaStreamTrack?.stop();
    this.status = 'stopped' as TrackStatus;
    this.emit('stopped');
  }

  attach(element: HTMLMediaElement): void {
    if (!this.mediaStreamTrack) {
      this.once('trackReady', () => this.attach(element));
      return;
    }

    if (!element.srcObject) {
      element.srcObject = new MediaStream([this.mediaStreamTrack!]);
    } else {
      const stream = element.srcObject as MediaStream;
      stream.addTrack(this.mediaStreamTrack!);
    }
    this.attachedElements.add(element);
  }

  detach(element?: HTMLMediaElement): void {
    if (element) {
      const stream = element.srcObject as MediaStream;
      if (stream && this.mediaStreamTrack) {
        stream.removeTrack(this.mediaStreamTrack);
        if (stream.getTracks().length === 0) {
          element.srcObject = null;
        }
      }
      this.attachedElements.delete(element);
    } else {
      this.attachedElements.forEach((el) => this.detach(el));
    }
  }

  requestQuality(quality: string): void {
    this.emit('qualityRequested', quality);
  }
}

export class RemoteVideoTrack extends RemoteTrack {
  constructor(id: string, source: TrackSource) {
    super(id, TrackKind.VIDEO, source);
  }
}

export class RemoteAudioTrack extends RemoteTrack {
  constructor(id: string, source: TrackSource) {
    super(id, TrackKind.AUDIO, source);
  }
}

// Helper functions to create local tracks
export async function createVideoTrack(
  options: VideoTrackOptions = {}
): Promise<LocalVideoTrack> {
  const constraints: MediaStreamConstraints = {
    video: {
      width: { ideal: options.resolution ? parseInt(options.resolution) : 1920 },
      height: { ideal: options.resolution ? parseInt(options.resolution.split('p')[0]) : 1080 },
      frameRate: { ideal: options.frameRate || 30 },
      facingMode: options.facingMode || 'user'
    }
  };

  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  const videoTrack = stream.getVideoTracks()[0];
  const id = `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return new LocalVideoTrack(id, options.source || TrackSource.CAMERA, videoTrack);
}

export async function createAudioTrack(
  options: AudioTrackOptions = {}
): Promise<LocalAudioTrack> {
  const constraints: MediaStreamConstraints = {
    audio: {
      echoCancellation: options.echoCancellation ?? true,
      noiseSuppression: options.noiseSuppression ?? true,
      autoGainControl: options.autoGainControl ?? true
    }
  };

  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  const audioTrack = stream.getAudioTracks()[0];
  const id = `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return new LocalAudioTrack(id, options.source || TrackSource.MICROPHONE, audioTrack);
}

export async function createScreenShareTrack(): Promise<LocalVideoTrack> {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { width: { ideal: 1920 }, height: { ideal: 1080 } }
  });
  
  const videoTrack = stream.getVideoTracks()[0];
  const id = `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return new LocalVideoTrack(id, TrackSource.SCREEN, videoTrack);
}
