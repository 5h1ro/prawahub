import {ServerId} from "./IServerAPI";
import {HTTPRequest} from "./HTTPRequest";

export interface SessionAPIClient {
    call(serverId: ServerId, request: HTTPRequest): Promise<any>;
}
