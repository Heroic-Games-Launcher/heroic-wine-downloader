import * as axios from 'axios'
import * as crypto from 'crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmdirSync,
  statSync
} from 'graceful-fs'

import {
  WINEGE_URL,
  PROTONGE_URL,
  PROTON_URL,
  WINELUTRIS_URL
} from './constants'
import { VersionInfo, Repositorys, State, ProgressInfo } from './types'
import {
  downloadFile,
  fetchReleases,
  getFolderSize,
  unlinkFile,
  unzipFile
} from './utilities'

interface getVersionsProps {
  repositorys?: Repositorys[]
  count?: number
}

/**
 * Fetch all available releases for given {@link Repositorys}.
 * If no repository is given, all {@link Repositorys} are checked.
 * @param repositorys array of {@link Repositorys}.
 * @defaultValue all {@link Repositorys}
 * @param count max versions to fetch for each {@link Repository}
 * @defaultValue 100
 * @returns * resolves with an array of {@link VersionInfo}
 *          * rejects with an {@link Error}
 */
async function getAvailableVersions({
  repositorys = [
    Repositorys.WINEGE,
    Repositorys.PROTONGE,
    Repositorys.PROTON,
    Repositorys.WINELUTRIS
  ],
  count = 100
}: getVersionsProps): Promise<VersionInfo[]> {
  const releases: Array<VersionInfo> = []
  for await (const repo of repositorys) {
    switch (repo) {
      case Repositorys.WINEGE: {
        await fetchReleases({
          url: WINEGE_URL,
          type: 'wine-ge',
          count: count
        })
          .then((fetchedReleases: VersionInfo[]) => {
            releases.push(...fetchedReleases)
          })
          .catch((error: Error) => {
            throw error
          })
        break
      }
      case Repositorys.PROTONGE: {
        await fetchReleases({
          url: PROTONGE_URL,
          type: 'proton-ge',
          count: count
        })
          .then((fetchedReleases: VersionInfo[]) => {
            releases.push(...fetchedReleases)
          })
          .catch((error: Error) => {
            throw error
          })
        break
      }
      case Repositorys.PROTON: {
        await fetchReleases({
          url: PROTON_URL,
          type: 'proton',
          count: count
        })
          .then((fetchedReleases: VersionInfo[]) => {
            releases.push(...fetchedReleases)
          })
          .catch((error: Error) => {
            throw error
          })
        break
      }
      case Repositorys.WINELUTRIS: {
        await fetchReleases({
          url: WINELUTRIS_URL,
          type: 'wine-lutris',
          count: count
        })
          .then((fetchedReleases: VersionInfo[]) => {
            releases.push(...fetchedReleases)
          })
          .catch((error: Error) => {
            throw error
          })
        break
      }
      default: {
        console.warn(
          `Unknown and not supported repository key passed! Skip fetch for ${repo}`
        )
        break
      }
    }
  }
  return releases
}

interface installProps {
  versionInfo: VersionInfo
  installDir: string
  overwrite?: boolean
  onProgress?: (state: State, progress?: ProgressInfo) => void
}

/**
 * Installs a given version to the given installation directory.
 *
 * @param versionInfo the version to install as {@link VersionInfo}
 * @param installDir absolute path to installation directory
 * @param overwrite allow overwriting existing version installation
 * @defaultValue false
 * @param onProgress callback to get installation progress
 * @defaultValue void
 * @returns * resolves with updated {@link VersionInfo} and the full installation
 *            directory
 *          * rejects with an {@link Error}
 */
async function installVersion({
  versionInfo,
  installDir,
  overwrite = false,
  onProgress = () => {
    return
  }
}: installProps): Promise<{ versionInfo: VersionInfo; installDir: string }> {
  // Check if installDir exist
  if (!existsSync(installDir)) {
    throw new Error(`Installation directory ${installDir} does not exist!`)
  } else if (!statSync(installDir).isDirectory()) {
    throw new Error(`Installation directory ${installDir} is not a directory!`)
  }

  if (!versionInfo.download) {
    // check versionInfo has download
    throw new Error(`No download link provided for ${versionInfo.version}!`)
  }

  // get name of the wine folder to install the selected version
  const folderNameParts = versionInfo.download
    .split('/') // split path
    .slice(-1)[0] // get the archive name
    .split('.') // split dots
    .slice(0, -2) // remove the archive extensions (tar.xz or tar.gz)
  const installSubDir = installDir + '/' + folderNameParts.join('.')

  const sourceChecksum = versionInfo.checksum
    ? (
        await axios.default.get(versionInfo.checksum, {
          responseType: 'text'
        })
      ).data
    : undefined

  // Check if it already exist
  if (existsSync(installSubDir) && !overwrite) {
    console.warn(`${versionInfo.version} is already installed. Skip installing! \n
      Consider using 'override: true if you wan't to override it!'`)

    // resolve with disksize
    versionInfo.disksize = getFolderSize(installSubDir)
    return { versionInfo: versionInfo, installDir: installSubDir }
  }

  // Prepare destination where to download tar file
  const tarFile =
    installDir + '/' + versionInfo.download.split('/').slice(-1)[0]

  if (existsSync(tarFile)) {
    if (!unlinkFile(tarFile)) {
      throw new Error(`Couldn't unlink already existing archive ${tarFile}!`)
    }
  }

  // Download
  await downloadFile({
    url: versionInfo.download,
    downloadDir: installDir,
    onProgress: onProgress
  }).catch((error: string) => {
    unlinkFile(tarFile)
    throw new Error(
      `Download of ${versionInfo.version} failed with:\n ${error}`
    )
  })

  // Check if download checksum is correct
  const fileBuffer = readFileSync(tarFile)
  const hashSum = crypto.createHash('sha512')
  hashSum.update(fileBuffer)

  const downloadChecksum = hashSum.digest('hex')
  if (!sourceChecksum.includes(downloadChecksum)) {
    unlinkFile(tarFile)
    throw new Error('Checksum verification failed')
  }

  // Unzip
  try {
    mkdirSync(installSubDir)
  } catch (error) {
    unlinkFile(tarFile)
    throw new Error(`Failed to make folder ${installSubDir} with:\n ${error}`)
  }

  await unzipFile({
    filePath: tarFile,
    unzipDir: installSubDir,
    overwrite: overwrite,
    onProgress: onProgress
  }).catch((error: string) => {
    rmdirSync(installSubDir, { recursive: true })
    unlinkFile(tarFile)
    throw new Error(
      `Unzip of ${tarFile.split('/').slice(-1)[0]} failed with:\n ${error}`
    )
  })

  // clean up
  unlinkFile(tarFile)

  // resolve with disksize
  versionInfo.disksize = getFolderSize(installSubDir)
  return { versionInfo: versionInfo, installDir: installSubDir }
}

export { getAvailableVersions, installVersion }
