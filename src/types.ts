/**
 * Defines from where the version comes
 */
export type Type =
  | 'Wine-GE'
  | 'Proton-GE'
  | 'Proton'
  | 'Wine-Lutris'
  | 'Wine-Kron4ek'

/**
 * Interface contains information about a version
 * - version
 * - type (wine, proton, lutris, ge ...)
 * - date
 * - download link
 * - checksum link
 * - size (download and disk)
 */
export interface VersionInfo {
  version: string
  type: Type
  date: string
  download: string
  downsize: number
  disksize: number
  checksum: string
}

/**
 * Enum for the supported repositorys
 */
export enum Repositorys {
  WINEGE,
  PROTONGE,
  PROTON,
  WINELUTRIS
}

/**
 * Type for the progress callback state
 */
export type State = 'downloading' | 'unzipping' | 'idle'

/**
 * Interface for the information that progress callback returns
 */
export interface ProgressInfo {
  percentage: number
  avgSpeed: number
  eta: number
}
