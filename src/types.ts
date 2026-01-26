export enum RoomRole {
  PUBLISHER = 'publisher',
  SUBSCRIBER = 'subscriber',
  MODERATOR = 'moderator'
}

export enum TrackKind {
  AUDIO = 'audio',
  VIDEO = 'video'
}

export enum TrackSource {
  CAMERA = 'camera',
  SCREEN = 'screen',
  MICROPHONE = 'microphone'
}

export enum TrackStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  STOPPED = 'stopped'
}

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed'
}

export enum ConnectionQuality {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor'
}

export interface JoinOptions {
  audio?: boolean;
  video?: boolean;
  role?: RoomRole;
  metadata?: Record<string, unknown>;
}

export interface VideoTrackOptions {
  source?: TrackSource;
  resolution?: string;
  frameRate?: number;
  facingMode?: 'user' | 'environment';
}

export interface AudioTrackOptions {
  source?: TrackSource;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
}

export interface ScreenShareOptions {
  cursor?: 'always' | 'motion' | 'never';
  surface?: 'monitor' | 'window' | 'application' | 'browser';
  captureSystemAudio?: boolean;
  selfBrowserSurface?: 'include' | 'exclude';
  surfaceSwitching?: 'include' | 'exclude';
}

export enum ParticipantState {
  ACTIVE = 'active',
  ON_HOLD = 'on_hold',
  IN_TRANSIT = 'in_transit'
}

export interface ZencClientOptions {
  url: string;
  token?: string;
  autoConnect?: boolean;
  reconnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export interface RoomInfo {
  id: string;
  name: string;
  maxUsers?: number;
  metadata?: Record<string, unknown>;
}

export interface ParticipantInfo {
  id: string;
  userId: string;
  role: RoomRole;
  metadata?: Record<string, unknown>;
  joinedAt: number;
}

export interface TrackInfo {
  id: string;
  kind: TrackKind;
  source: TrackSource;
  status: TrackStatus;
  participantId: string;
}

// WebSocket message types
export interface WSMessage {
  type: string;
  data?: unknown;
}

export interface JoinRoomRequest {
  roomId: string;
  userId: string;
  role: RoomRole;
  metadata?: Record<string, unknown>;
}

export interface JoinRoomResponse {
  participantId: string;
  room: RoomInfo;
  participants: ParticipantInfo[];
}

export interface PublishTrackRequest {
  participantId: string;
  track: TrackInfo;
  sdpOffer: string;
}

export interface PublishTrackResponse {
  trackId: string;
  sdpAnswer: string;
}

export interface SubscribeTrackRequest {
  participantId: string;
  trackId: string;
}

export interface SubscribeTrackResponse {
  sdpOffer: string;
}

export interface ICECandidateMessage {
  candidate: RTCIceCandidateInit;
  trackId?: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
  code: number;
}

export class TrackLimitError extends Error {
  public code = 'TRACK_LIMIT_EXCEEDED';
  
  constructor(message: string) {
    super(message);
    this.name = 'TrackLimitError';
  }
}

export class ParticipantOnHoldError extends Error {
  public code = 'PARTICIPANT_ON_HOLD';
  
  constructor(message: string = 'Cannot publish tracks while participant is on hold') {
    super(message);
    this.name = 'ParticipantOnHoldError';
  }
}
