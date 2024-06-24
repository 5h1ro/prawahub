import type {ServerInfo} from "./hub/IHubServerAPI";
import EventEmitter from "eventemitter3";

export class WebSocketClient {
    private connection: null | WebSocket
    private ev: EventEmitter<string | symbol, any>;

    constructor(private server: ServerInfo) {
        this.connection = null
        this.ev = new EventEmitter()
    }

    connect() {
        let url = this.server.connection.url
            .replace("http://", "ws://")
            .replace("https://", "wss://")

        // remove trailing /
        if (url.endsWith("/")) {
            url = url.slice(0, -1)
        }
        // add /ws
        if (!url.endsWith("/ws")) {
            url += "/ws"
        }
        // Add ?session=*&events=session.status
        const params = new URLSearchParams()
        params.append("session", "*")
        params.append("events", "session.status")
        if (this.server.connection.key){
            params.append("x-api-key", this.server.connection.key)
        }
        url += "?" + params.toString()

        this.connection = new WebSocket(url)

        this.connection.onopen = () => {
            console.debug(`WS - Connected - ${this.server.name}`)
        }
        this.connection.onclose = () => {
            console.debug(`WS - Disconnected - ${this.server.name}`)
        }
        this.connection.onerror = (e) => {
            console.error(`WS - Error - ${this.server.name}`, e)
        }
        this.connection.onmessage = (e) => {
            const data = JSON.parse(e.data)
            this.ev.emit(data.event, data)
        }
    }

    on(event: string, cb: (data: any) => void) {
        this.ev.on(event, cb)
    }

    stop() {
        if (this.connection?.readyState === 1){
            this.connection?.close()
        }
        this.ev.removeAllListeners()
    }
}
