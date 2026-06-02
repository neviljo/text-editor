export type MemberRole = "owner" | "editor" | "viewer";
export interface CollaborationContextState {
    provider: unknown;
    ydoc: unknown;
    isSynced: boolean;
    roomId: string;
    userId?: string | null;
    accessDenied: boolean;
    connectionError: string | null;
}
export interface RoomCreateRequest {
    ownerId?: string;
}
export interface RoomCreateResponse {
    roomId: string;
}
export interface RoomDeleteRequest {
    userId: string;
}
export interface RoomUpdateRequest {
    userId: string;
    isPublic?: boolean;
}
export interface ApiResponse<T = unknown> {
    success?: boolean;
    error?: string;
    data?: T;
}
export interface UserAwareness {
    name: string;
    color: string;
    colorLight: string;
}
//# sourceMappingURL=types.d.ts.map