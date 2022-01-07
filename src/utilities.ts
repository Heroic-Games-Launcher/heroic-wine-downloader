import * as axios from 'axios'
import { existsSync, statSync, unlinkSync } from 'graceful-fs'
import { spawnSync, spawn } from 'child_process'
import { ProgressInfo, State, VersionInfo } from './types'

interface fetchProps {
  url: string
  type: 'wine-ge' | 'proton-ge' | 'proton' | 'wine-lutris'
  count: number
}

function fetchReleases({
  url,
  type,
  count
}: fetchProps): Promise<VersionInfo[]> {
  const releases: Array<VersionInfo> = []
  return new Promise((resolve, reject) => {
    axios.default
      .get(url + '?per_page=' + count)
      .then((data) => {
        for (const release of data.data) {
          const release_data = {} as VersionInfo
          release_data.version = release.tag_name
          release_data.type = type
          release_data.date = release.published_at.split('T')[0]
          release_data.disksize = 0

          for (const asset of release.assets) {
            if (asset.name.endsWith('sha512sum')) {
              release_data.checksum = asset.browser_download_url
            } else if (
              asset.name.endsWith('tar.gz') ||
              asset.name.endsWith('tar.xz')
            ) {
              release_data.download = asset.browser_download_url
              release_data.downsize = asset.size
            }
          }

          releases.push(release_data)
        }
        resolve(releases)
      })
      .catch((error) => {
        reject(
          new Error(
            `Could not fetch available releases from ${url} with error:\n ${error}`
          )
        )
      })
  })
}

function unlinkFile(filePath: string) {
  try {
    unlinkSync(filePath)
    return true
  } catch {
    return false
  }
}

function getFolderSize(folder: string) {
  const { stdout } = spawnSync('du', ['-sb', folder])
  return parseInt(stdout.toString())
}

interface downloadProps {
  link: string
  downloadDir: string
  onProgress: (state: State, progress?: ProgressInfo) => void
}

async function downloadFile({
  link,
  downloadDir,
  onProgress
}: downloadProps): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      if (!existsSync(downloadDir)) {
        reject(`Download path ${downloadDir} does not exist!`)
      } else if (!statSync(downloadDir).isDirectory()) {
        reject(`Download path ${downloadDir} is not a directory!`)
      }
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore: can't give error a type but it mostly a Error or SystemError
      reject(error.message)
    }

    let percentage = 0
    const filePath = downloadDir + '/' + link.split('/').slice(-1)[0]
    const download = spawn('curl', ['-L', link, '-o', filePath, '-#'])

    // curl does somehow print on stderr
    // progress calculation is done on stderr
    download.stderr.on('data', function (stderr) {
      // get info from curl output
      const newPercentage = parseInt(stderr.toString())

      // check if percentage is valid
      percentage = !isNaN(newPercentage) ? newPercentage : percentage

      // check if speed is valid and convert to Bytes per second

      onProgress('downloading', {
        percentage: percentage
      })
    })

    download.on('close', function (exitcode: number) {
      onProgress('idle')
      if (exitcode !== 0) {
        reject(`Download of ${link} failed with exit code ${exitcode}!`)
      }

      resolve(`Succesfully downloaded ${link} to ${filePath}.`)
    })
  })
}

interface unzipProps {
  filePath: string
  unzipDir: string
  overwrite?: boolean
  onProgress: (state: State, progress?: ProgressInfo) => void
}

async function unzipFile({
  filePath,
  unzipDir,
  overwrite = false,
  onProgress
}: unzipProps): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      if (!existsSync(filePath)) {
        reject(`Zip file ${filePath} does not exist!`)
      } else if (statSync(filePath).isDirectory()) {
        reject(`Archive path ${filePath} is not a file!`)
      } else if (!existsSync(unzipDir)) {
        reject(`Install path ${unzipDir} does not exist!`)
      }
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore: can't give error a type but it mostly a Error or SystemError
      reject(error.message)
    }

    let extension_options = ''
    if (filePath.endsWith('tar.gz')) {
      extension_options = '-vzxf'
    } else if (filePath.endsWith('tar.xz')) {
      extension_options = '-vJxf'
    } else {
      reject(`Archive type ${filePath.split('.').pop()} not supported!`)
    }

    const args = [
      '--directory',
      unzipDir,
      '--strip-components=1',
      extension_options,
      filePath
    ]

    if (overwrite) {
      args.push('--overwrite')
    }

    const unzip = spawn('tar', args)

    onProgress('unzipping')

    unzip.stdout.on('data', function () {
      onProgress('unzipping')
    })

    unzip.stderr.on('data', function (stderr: string) {
      onProgress('idle')
      reject(stderr)
    })

    unzip.on('close', function (exitcode: number) {
      onProgress('idle')
      if (exitcode !== 0) {
        reject(`Unzip of ${filePath} failed with exit code ${exitcode}!`)
      }

      resolve(`Succesfully unzip ${filePath} to ${unzipDir}.`)
    })
  })
}

export { fetchReleases, unlinkFile, getFolderSize, downloadFile, unzipFile }
