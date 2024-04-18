import {ServerId} from "./ServerAPI";
import {Session} from "./Session";

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

    async getSessions(serverId: ServerId): Promise<Session[]> {
        return this.api.call(serverId, {
            method: 'GET',
            uri: '/api/sessions',
            params: {},
        });
    }
}
