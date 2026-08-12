export type PlatformRole = 'SYSTEM_ADMIN'

export interface PlatformUser {
  id: number
  firstName: string
  lastName: string
  email: string
  role: PlatformRole
}

export interface PlatformLoginCredentials {
  email: string
  password: string
}

export interface PlatformSession {
  accessToken: string
  expiresInSeconds: number
}

export interface PlatformLoginResponse extends PlatformSession {
  user: PlatformUser
}
