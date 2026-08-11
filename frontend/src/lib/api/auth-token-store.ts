let accessToken: string | null = null

export const authTokenStore = {
  get(): string | null {
    return accessToken
  },

  set(token: string): void {
    accessToken = token
  },

  clear(): void {
    accessToken = null
  },
}
