import type {Session} from "./Session";

type ServerId = string;

export interface ServerConnection {
    url: string;
    key?: string;
}

export interface ServerInfo {
    id: ServerId,
    name: string,
    connection: ServerConnection,
    version?: Version,
    connected?: boolean,
}

export interface CreateServerInfo {
    name: string,
    connection: ServerConnection,
}

export interface Version {
    version: string;
    engine: string;
}

export interface IServerService {
    add(data: CreateServerInfo): Promise<void>;

    get(serverId: ServerId): Promise<ServerInfo>;

    list(): Promise<ServerInfo[]>;

    remove(serverId: ServerInfo): Promise<void>;

    edit(serverId: ServerId, data: ServerInfo): Promise<void>;

    getVersion(serverId: ServerId): Promise<Version>;

    getSessions(serverId: ServerId): Promise<Session[]>;
}
