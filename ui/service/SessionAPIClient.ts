import {ServerId} from "./IServerAPI";

export interface RPCRequest {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    uri: string;
    params: any;
    body?: any;
}

export interface SessionAPIClient {
    call(serverId: ServerId, request: RPCRequest): Promise<any>;
}
