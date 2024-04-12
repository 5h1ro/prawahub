export interface SessionConfig {
}
export type SessionStatus = "STOPPED" | "STARTING" | "SCAN_QR_CODE" | "WORKING" | "FAILED";

export interface Session {
    name: string;
    status: SessionStatus;
    config: SessionConfig;
}
