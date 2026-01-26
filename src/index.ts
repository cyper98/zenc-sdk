// Main SDK exports
export { ZencClient } from './client/ZencClient';
export { Room } from './room/Room';
export { Participant, LocalParticipant } from './participant/Participant';
export {
  Track,
  LocalTrack,
  LocalVideoTrack,
  LocalAudioTrack,
  RemoteTrack,
  RemoteVideoTrack,
  RemoteAudioTrack,
  createVideoTrack,
  createAudioTrack,
  createScreenShareTrack
} from './track/Track';
export { SignalingClient } from './connection/SignalingClient';
export { PeerConnection } from './connection/PeerConnection';

// Export types
export type {
  ZencClientOptions,
  JoinOptions,
  VideoTrackOptions,
  AudioTrackOptions,
  RoomInfo,
  ParticipantInfo,
  TrackInfo,
  RoomRole,
  TrackKind,
  TrackSource,
  TrackStatus,
  ConnectionState,
  ConnectionQuality
} from './types';
