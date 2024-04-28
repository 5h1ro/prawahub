import {ServerId} from "../IHubServerAPI";
import {HTTPRequest} from "./HTTPRequest";

export interface IWahaAPIClient {
    call(serverId: ServerId, request: HTTPRequest): Promise<any>;
}
