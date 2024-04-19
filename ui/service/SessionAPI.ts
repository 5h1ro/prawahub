import {ServerId} from "./IServerAPI";
import {Session, SessionStartRequest} from "./Session";
import {SessionAPIClient} from "./SessionAPIClient";
import {HTTPRequest} from "./HTTPRequest";

export class SessionAPI {
    private api: SessionAPIClient;

    constructor(api: SessionAPIClient) {
        this.api = api;
    }

    call(serverId: ServerId, request: HTTPRequest): Promise<any> {
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
            uri: `/api/sessions/stop`,
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
