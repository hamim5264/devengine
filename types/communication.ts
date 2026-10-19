export interface StudioPerson {
  id: string; uid: string; name: string; avatarUrl: string; role: 'admin' | 'employee';
  status: 'active' | 'suspended'; departmentIds: string[]; chatSuspended: boolean;
}
export interface Department {
  id: string; title: string; description: string; avatarUrl: string; memberIds: string[];
  deleted: boolean; createdAt: string; updatedAt: string;
}
export interface StudioConversation {
  id: string; kind: 'direct' | 'department'; participantIds: string[]; departmentId: string;
  title: string; description: string; avatarUrl: string; createdAt: string; deleted: boolean;
  lastMessage?: string; lastMessageAt?: string; lastSenderId?: string;
}
export interface StudioMessage {
  id: string; senderId: string; senderName: string; text: string; createdAt: string;
  replyTo: string; replyText: string; replyName: string;
}
export interface StudioNotification {
  id: string; recipientId: string; title: string; body: string; href: string;
  kind: string; read: boolean; createdAt: string;
}
export interface StudioNotice {
  id: string; title: string; body: string; priority: 'normal' | 'important';
  authorId: string; createdAt: string; updatedAt: string;
}
export interface ConversationState { archived?: boolean; lastReadAt?: string }
export type ChatBackground = 'aurora' | 'grid' | 'paper' | 'stars' | 'calm';
