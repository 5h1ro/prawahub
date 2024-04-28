import {defineStore} from 'pinia'
import {reactive, ref} from "vue"
import type {IHubServerAPI, ServerId, ServerInfo} from "../services/hub/IHubServerAPI";
import type {Session, SessionStartRequest} from "../services/waha/dtos";
import {computed} from "../.nuxt/imports";
// @ts-ignore
import lodash from "lodash";
import {WahaAPI} from "../services/waha/WahaAPI";
import {WahaGlobalVersionAPI} from "../services/WahaGlobalVersionAPI";
import {HubServerLocalAPI} from "../services/impl/hub/HubServerLocalAPI";
import {WahaAPIDirectClient} from "../services/impl/waha/WahaAPIDirectClient";
import {sleep} from "../services/utils";


export const useServerStore = defineStore('serverStore', () => {
    // Mock
    // const hubServerAPI: IHubServerAPI = new HubServerLocalAPI()
    // const wahaAPIClient = new WahaAPIMockClient()

    // Local
    const hubServerAPI: IHubServerAPI = new HubServerLocalAPI()
    const wahaAPIClient = new WahaAPIDirectClient(hubServerAPI)

    const wahaAPI = new WahaAPI(wahaAPIClient)
    const latestVersion = ref(undefined)
    const refreshing = ref(false)
    const wahaGithubAPI = new WahaGlobalVersionAPI()

    const servers = ref<ServerInfo[]>([])
    const sessions = reactive(new Map<string, Session[]>())

    async function fetchServers() {
        console.log('fetchServers')
        const data = await hubServerAPI.list()
        servers.value = data.map(server => reactive(server))
    }

    async function fetchLatestWAHAVersion() {
        if (latestVersion.value) {
            return
        }
        const version = await wahaGithubAPI.getLatestVersion()
        latestVersion.value = version || latestVersion.value
    }

    async function refreshServer(id: string) {
        console.log('refreshServer', id)
        const server = servers.value.find(server => server.id === id)
        if (!server) {
            return
        }
        const requests = [
            fetchVersion(server),
            fetchSessions(server.id)
        ]
        // Await all, set connected based on the result
        try {
            await Promise.all(requests)
            server.connected = true
        } catch (e) {
            server.connected = false
            console.error(`Failed to refresh server - ${id}`, e)
        }
    }

    async function fetchSessions(id: string) {
        console.log('fetchSessions', id)
        sessions.set(id, await wahaAPI.getSessions(id))
    }

    async function fetchVersion(server: ServerInfo) {
        console.log('fetchVersion', server.id)
        server.version = await wahaAPI.getVersion(server.id)
    }

    async function refresh() {
        console.log('refresh')
        fetchLatestWAHAVersion()
        refreshing.value = true
        await fetchServers()
        const requests = []
        for (const server of servers.value) {
            requests.push(refreshServer(server.id))
        }
        try {
            await Promise.all(requests)
        } finally {
            refreshing.value = false
            console.log('refresh - COMPLETED')
        }
    }

    async function addServer(server: ServerInfo) {
        await hubServerAPI.add(server)
        await refresh()
    }

    async function deleteServer(id: string) {
        await hubServerAPI.remove(id)
        sessions.delete(id)
        await refresh()
    }

    async function editServer(id: string, server: ServerInfo) {
        await hubServerAPI.edit(id, server)
        await refresh()
    }

    function getServer(id: string) {
        return servers.value.filter(server => server.id === id)?.[0]
    }

    async function startSession(id: ServerId, body: SessionStartRequest): Promise<void> {
        await wahaAPI.startSession(id, body)
        refresh()
    }

    async function stopSession(id: ServerId, sessionName: string, logout: boolean): Promise<void> {
        await wahaAPI.stopSession(id, sessionName, logout)
        refresh()
    }

    async function logoutSession(id: ServerId, sessionName: string): Promise<void> {
        await wahaAPI.logoutSession(id, sessionName)
        refresh()
    }

    async function getScreenshot(serverId: ServerId, sessionName: string): Promise<string> {
        return wahaAPI.getScreenshot(serverId, sessionName)
    }

    async function getProfilePicture(serverId: ServerId, sessionName: string, contactId: string): Promise<string> {
        return wahaAPI.getProfilePicture(serverId, sessionName, contactId)
    }

    const allSessions = computed(() => {
            const result = new Array<Session>()
            sessions.forEach((value, key) => {
                const server = getServer(key)
                const sessions = value.map(session => {
                    const data = lodash.cloneDeep(session)
                    data.server = server
                    return data
                })
                result.push(...sessions)
            })
            return result
        }
    )

    return {
        servers,
        sessions,
        allSessions,
        refresh,
        refreshing,
        addServer,
        deleteServer,
        editServer,
        getServer,
        startSession,
        stopSession,
        logoutSession,
        getScreenshot,
        getProfilePicture,
        latestVersion,
    }
})
