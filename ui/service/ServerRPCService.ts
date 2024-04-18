import {ServerId} from "./ServerAPI";
import {Session, SessionStartRequest} from "./Session";

export interface RPCRequest {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    uri: string;
    params: any;
    body?: any;
}

export interface RPCApiClient {
    call(
        serverId: ServerId,
        request: RPCRequest,
    ): Promise<any>;
}

export class ServerRPCService {
    private api: RPCApiClient;

    constructor(api: RPCApiClient) {
        this.api = api;
    }

    call(serverId: ServerId, request: RPCRequest): Promise<any> {
        return this.api.call(serverId, request);
    }

    getSessions(serverId: ServerId): Promise<Session[]> {
        return this.api.call(serverId, {
            method: 'GET',
            uri: '/api/sessions',
            params: {all: true},
        });
    }

    startSession(serverId: ServerId, body: SessionStartRequest): Promise<void> {
        return this.api.call(serverId, {
            method: 'POST',
            uri: '/api/sessions',
            params: {},
            body: body,
        });
    }

    stopSession(serverId: ServerId, sessionName: string, logout: boolean): Promise<void> {
        return this.api.call(serverId, {
            method: 'POST',
            uri: `/api/sessions/`,
            params: {},
            body: {
                logout: logout,
                session: sessionName,
            },
        });
    }

    logoutSession(serverId: ServerId, sessionName: string): Promise<void> {
        return this.api.call(serverId, {
            method: 'POST',
            uri: `/api/sessions/logout`,
            params: {},
            body: {
                session: sessionName,
            },
        });
    }

    getScreenshot(serverId: ServerId, sessionName: string): Promise<string> {
        return this.api.call(serverId, {
            method: 'GET',
            uri: `/api/screenshot`,
            params: {session: sessionName},
        });
    }
}
