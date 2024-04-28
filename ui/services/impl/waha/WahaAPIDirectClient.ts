import {IWahaAPIClient} from "../../waha/IWahaAPIClient";
import {HTTPRequest} from "../../waha/HTTPRequest";
import {ServerConnection} from "../../hub/IHubServerAPI";


interface ServerResolver {
    resolve(serverId: string): Promise<ServerConnection>
}

/**
 * Call directly API using axios
 */
class WahaAPIDirectClient implements IWahaAPIClient {
    constructor(private resolver: ServerResolver) {
    }

    async call(serverId: string, request: HTTPRequest): Promise<any> {
        const connection = await this.resolver.resolve(serverId)
        const url = new URL(request.uri, connection.url).toString()
        const headers = {
            'Content-Type': 'application/json',
        }
        if (connection.key) {
            headers['Authorization'] = `Bearer ${connection.key}`
        }
        const response = await fetch(url, {
            method: request.method,
            headers: headers,
            body: JSON.stringify(request.body),
        })
        return await response.json()
    }
}
