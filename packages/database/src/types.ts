import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type {
  users,
  organizations,
  workspaces,
  projects,
  recordings,
  transcripts,
  transcriptSegments,
  speakers,
  speakerProfiles,
  templates,
  customFields,
  auditLogs,
} from './schema';

// User types
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

// Organization types
export type Organization = InferSelectModel<typeof organizations>;
export type NewOrganization = InferInsertModel<typeof organizations>;

// Workspace types
export type Workspace = InferSelectModel<typeof workspaces>;
export type NewWorkspace = InferInsertModel<typeof workspaces>;

// Project types
export type Project = InferSelectModel<typeof projects>;
export type NewProject = InferInsertModel<typeof projects>;

// Recording types
export type Recording = InferSelectModel<typeof recordings>;
export type NewRecording = InferInsertModel<typeof recordings>;

// Transcript types
export type Transcript = InferSelectModel<typeof transcripts>;
export type NewTranscript = InferInsertModel<typeof transcripts>;

// Transcript segment types
export type TranscriptSegment = InferSelectModel<typeof transcriptSegments>;
export type NewTranscriptSegment = InferInsertModel<typeof transcriptSegments>;

// Speaker types
export type Speaker = InferSelectModel<typeof speakers>;
export type NewSpeaker = InferInsertModel<typeof speakers>;

// Speaker profile types
export type SpeakerProfile = InferSelectModel<typeof speakerProfiles>;
export type NewSpeakerProfile = InferInsertModel<typeof speakerProfiles>;

// Template types
export type Template = InferSelectModel<typeof templates>;
export type NewTemplate = InferInsertModel<typeof templates>;

// Custom field types
export type CustomField = InferSelectModel<typeof customFields>;
export type NewCustomField = InferInsertModel<typeof customFields>;

// Audit log types
export type AuditLog = InferSelectModel<typeof auditLogs>;
export type NewAuditLog = InferInsertModel<typeof auditLogs>;
