import {ServerInfo} from "./IServerService";

export interface SessionConfig {
}
export type SessionStatus = "STOPPED" | "STARTING" | "SCAN_QR_CODE" | "WORKING" | "FAILED";

export const SessionStatuses = [
    "WORKING",
    "FAILED",
    "STARTING",
    "SCAN_QR_CODE",
    "STOPPED",
];

export interface Session {
    name: string;
    status: SessionStatus;
    config: SessionConfig;
    server?: ServerInfo;
}
