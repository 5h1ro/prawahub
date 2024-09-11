export class WahaGlobalVersionAPI {
    private versionFile = "https://api.github.com/repos/devlikeapro/waha/releases?per_page=1"

    /**
     * Get the latest version of waha using GitHub API
     */
    async getLatestVersion(): Promise<string> {
        const response = await fetch(this.versionFile, {cache: "no-store"})
        const json = await response.json()
        return json[0].tag_name
    }
}
