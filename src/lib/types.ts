export type Level = 1 | 2 | 3;
export interface Persona { id: string; name: string; email: string; role: string; level: Level; projects: string[]; canErase?: boolean }
export interface Context { workspaceId: string; persona: Persona; projectId: string; level: Level; epoch: number }
export interface Source { id: string; documentId: string; title: string; type: string; date: string; author: string; text: string; level: Level; position: string; participants: string[]; email?: {from: string; to: string[]; cc: string[]}; generated?: boolean }
export interface Citation { sourceId: string; quote: string; title: string; date: string; author: string; position: string }
export interface Claim { id: string; kind: string; text: string; status: string; sourceIds: string[]; level: Level; personIds?: string[] }
export interface Person { id: string; name: string; email: string; role: string; aliases: string[]; sourceIds: string[] }
export interface Answer { id: string; text: string; citations: Citation[]; createdAt: string; kind: string; level: Level; question?: string; trace: string[] }
export interface Preference { id: string; text: string; createdAt: string }
export interface Mail { id: string; threadId: string; subject: string; from: string; to: string[]; cc: string[]; body: string; date: string; status: string; error?: string; answer?: Answer; level: Level }
export interface Job { id: string; kind: string; status: string; error?: string; createdAt: string }
export interface Meeting { id: string; title: string; date: string; attendees: string[]; purpose: string }
export interface WorkspaceData { context: Context; personas: Persona[]; sources: Source[]; claims: Claim[]; people: Person[]; brief: Answer | null; chat: Answer[]; preferences: Preference[]; mails: Mail[]; meetings: Meeting[]; jobs: Job[]; receipts: {id: string; createdAt: string; sourcesRemoved: number; artifactsRemoved: number}[]; stats: {documents:number; sources:number; claims:number}; archiveDate: string }
