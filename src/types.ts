/**
 * Interface contains information about a version
 * - version
 * - type
 * - date
 * - download link
 * - checksum link
 * - size (download and disk)
 * - update available
 * - installed
 * - install directory
 */

export interface VersionInfo {
  version: string
  type: 'wine-ge' | 'proton-ge' | 'proton' | 'wine-lutris'
  date: string
  download: string
  downsize: number
  disksize: number
  checksum: string
}

export enum Repositorys {
  WINEGE,
  PROTONGE,
  PROTON,
  WINELUTRIS
}

export type State = 'downloading' | 'unzipping' | 'idle'

export interface ProgressInfo {
  percentage: number
}
