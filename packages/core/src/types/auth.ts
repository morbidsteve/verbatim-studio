/**
 * Authentication and authorization types
 */

import type { UUID, Timestamp } from './common';

export type LicenseTier = 'basic' | 'enterprise';

export type DeploymentMode = 'local-only' | 'self-hosted' | 'cloud-hosted';

export interface License {
  key: string;
  tier: LicenseTier;
  organizationId?: string;
  expiresAt: Timestamp;
  features: FeatureFlags;
  maxUsers?: number;
  isValid: boolean;
}

export interface FeatureFlags {
  // Core features (always enabled)
  transcription: boolean;
  diarization: boolean;
  aiFeatures: boolean;
  export: boolean;

  // Enterprise features
  multiUser: boolean;
  teamWorkspaces: boolean;
  sso: boolean;
  auditLogs: boolean;
  browserAccess: boolean;
  meetingBots: boolean;
  priorityQueue: boolean;
  analytics: boolean;
}

export interface User {
  id: UUID;
  email: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
  organizationId?: UUID;
  workspaceIds: UUID[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
  isApproved: boolean;
  isSuspended: boolean;
}

export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface Permission {
  resource: ResourceType;
  action: ActionType;
}

export type ResourceType =
  | 'project'
  | 'recording'
  | 'transcript'
  | 'workspace'
  | 'organization'
  | 'user'
  | 'settings';

export type ActionType = 'create' | 'read' | 'update' | 'delete' | 'share' | 'export';

export interface Session {
  userId: UUID;
  accessToken: string;
  refreshToken: string;
  expiresAt: Timestamp;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  inviteCode?: string;
}

export interface Organization {
  id: UUID;
  name: string;
  slug: string;
  logoUrl?: string;
  licenseTier: LicenseTier;
  settings: OrganizationSettings;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface OrganizationSettings {
  allowPublicSignup: boolean;
  requireApproval: boolean;
  defaultUserRole: UserRole;
  ssoEnabled: boolean;
  ssoProvider?: 'saml' | 'oidc';
  ssoConfig?: Record<string, unknown>;
}

export interface Workspace {
  id: UUID;
  organizationId: UUID;
  name: string;
  description?: string;
  memberIds: UUID[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
