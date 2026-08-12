let platformAccessToken: string | null = null

export const platformTokenStore = {
  get(): string | null {
    return platformAccessToken
  },

  set(token: string): void {
    platformAccessToken = token
  },

  clear(): void {
    platformAccessToken = null
  },
}
