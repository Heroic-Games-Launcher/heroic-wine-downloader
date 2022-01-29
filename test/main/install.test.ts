import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  copyFileSync
} from 'graceful-fs'
import { installVersion } from '../../src/main'
import { VersionInfo } from '../../src/types'
import * as axios from 'axios'
import * as crypto from 'crypto'

const workDir = process.cwd()

describe('Main - InstallVersion', () => {
  test('install fails because installDir does not exist', async () => {
    const progress = jest.fn()

    const releaseVersion: VersionInfo = {
      version: '1.2.3',
      type: 'wine-ge',
      date: '12/24/2021',
      download: '',
      downsize: 100,
      disksize: 0,
      checksum: ''
    }
    await installVersion({
      versionInfo: releaseVersion,
      installDir: 'invalid',
      onProgress: progress
    })
      .then(() => {
        throw Error('No error should be thrown!')
      })
      .catch((error) => {
        expect(error.message).toBe(
          'Installation directory invalid does not exist!'
        )
      })
  })

  test('install fails because installDir is not a directory', async () => {
    const progress = jest.fn()

    const releaseVersion: VersionInfo = {
      version: '1.2.3',
      type: 'wine-ge',
      date: '12/24/2021',
      download: '',
      downsize: 100,
      disksize: 0,
      checksum: ''
    }
    await installVersion({
      versionInfo: releaseVersion,
      installDir: __filename,
      onProgress: progress
    })
      .then(() => {
        throw Error('No error should be thrown!')
      })
      .catch((error) => {
        expect(error.message).toBe(
          `Installation directory ${workDir}/test/main/install.test.ts is not a directory!`
        )
      })
  })

  test('install fails because no download link provided', async () => {
    const progress = jest.fn()

    const releaseVersion: VersionInfo = {
      version: '1.2.3',
      type: 'wine-ge',
      date: '12/24/2021',
      download: '',
      downsize: 100,
      disksize: 0,
      checksum: ''
    }
    await installVersion({
      versionInfo: releaseVersion,
      installDir: __dirname,
      onProgress: progress
    })
      .then(() => {
        throw Error('No error should be thrown!')
      })
      .catch((error) => {
        expect(error.message).toBe('No download link provided for 1.2.3!')
      })
  })

  test('install fails because no download link provided', async () => {
    const progress = jest.fn()

    const releaseVersion: VersionInfo = {
      version: '1.2.3',
      type: 'wine-ge',
      date: '12/24/2021',
      download: '',
      downsize: 100,
      disksize: 0,
      checksum: ''
    }
    await installVersion({
      versionInfo: releaseVersion,
      installDir: __dirname,
      onProgress: progress
    })
      .then(() => {
        throw Error('No error should be thrown!')
      })
      .catch((error) => {
        expect(error.message).toBe('No download link provided for 1.2.3!')
      })
  })

  test('install fails because of checksum missmatch', async () => {
    const checksum = 'invalid_checksum'

    const installDir = __dirname + '/test_install'
    let failed = false
    axios.default.get = jest.fn().mockReturnValue({ data: checksum })
    const progress = jest.fn()

    if (!existsSync(installDir)) {
      mkdirSync(installDir)
    }

    const releaseVersion: VersionInfo = {
      version: '1.2.3',
      type: 'wine-ge',
      date: '12/24/2021',
      download: `file:///${__dirname}/../test_data/test.tar.xz`,
      downsize: 100,
      disksize: 0,
      checksum: '<to-checksum-file>'
    }
    await installVersion({
      versionInfo: releaseVersion,
      installDir: installDir,
      onProgress: progress
    })
      .then(() => {
        failed = true
      })
      .catch((error) => {
        expect(error.message).toBe('Checksum verification failed')
      })

    if (existsSync(installDir)) {
      rmSync(installDir, { recursive: true })
    }

    if (failed) {
      throw Error('No error should be thrown!')
    }

    expect(axios.default.get).toBeCalledWith('<to-checksum-file>', {
      responseType: 'text'
    })

    expect(progress).toBeCalledWith('downloading', {
      percentage: expect.any(Number),
      avgSpeed: expect.any(Number),
      eta: expect.any(Number)
    })
    expect(progress).not.toBeCalledWith('unzipping')
    expect(progress).toBeCalledWith('idle')
  })

  test('install succeed because already exist', async () => {
    const installDir = __dirname + '/test_install'
    let failed = false
    axios.default.get = jest.fn().mockReturnValue({ data: '' })
    const progress = jest.fn()

    if (!existsSync(installDir)) {
      mkdirSync(`${installDir}/test`, { recursive: true })
    }

    const releaseVersion: VersionInfo = {
      version: '1.2.3',
      type: 'wine-ge',
      date: '12/24/2021',
      download: `file:///${__dirname}/../test_data/test.tar.xz`,
      downsize: 100,
      disksize: 0,
      checksum: '<to-checksum-file>'
    }
    await installVersion({
      versionInfo: releaseVersion,
      installDir: installDir,
      onProgress: progress
    })
      .then((response) => {
        expect(response.versionInfo).toBe(releaseVersion)
        expect(response.installDir).toBe(`${installDir}/test`)
      })
      .catch(() => {
        failed = true
      })

    if (existsSync(installDir)) {
      rmSync(installDir, { recursive: true })
    }

    if (failed) {
      throw Error('No error should be thrown!')
    }

    expect(axios.default.get).toBeCalledWith('<to-checksum-file>', {
      responseType: 'text'
    })
  })

  test('install succeed', async () => {
    const fileLink = `${__dirname}/../test_data/test.tar.xz`
    const fileBuffer = readFileSync(fileLink)
    const hashSum = crypto.createHash('sha512')
    hashSum.update(fileBuffer)
    const checksum = hashSum.digest('hex')

    const installDir = __dirname + '/test_install'
    let failed = false
    axios.default.get = jest.fn().mockReturnValue({ data: checksum })
    const progress = jest.fn()

    if (!existsSync(installDir)) {
      mkdirSync(installDir)
    }

    const releaseVersion: VersionInfo = {
      version: '1.2.3',
      type: 'wine-ge',
      date: '12/24/2021',
      download: `file:///${fileLink}`,
      downsize: 100,
      disksize: 0,
      checksum: '<to-checksum-file>'
    }
    await installVersion({
      versionInfo: releaseVersion,
      installDir: installDir,
      onProgress: progress
    })
      .then((response) => {
        expect(response.versionInfo).toBe(releaseVersion)
        expect(response.installDir).toBe(`${installDir}/test`)
      })
      .catch(() => {
        failed = true
      })

    if (existsSync(installDir)) {
      rmSync(installDir, { recursive: true })
    }

    if (failed) {
      throw Error('No error should be thrown!')
    }

    expect(axios.default.get).toBeCalledWith('<to-checksum-file>', {
      responseType: 'text'
    })

    expect(progress).toBeCalledWith('downloading', {
      percentage: expect.any(Number),
      avgSpeed: expect.any(Number),
      eta: expect.any(Number)
    })
    expect(progress).toBeCalledWith('unzipping')
    expect(progress).toBeCalledWith('idle')
  })

  test('install succeed if tar file still exists in install dir', async () => {
    const fileLink = `${__dirname}/../test_data/test.tar.xz`
    const fileBuffer = readFileSync(fileLink)
    const hashSum = crypto.createHash('sha512')
    hashSum.update(fileBuffer)
    const checksum = hashSum.digest('hex')

    const installDir = __dirname + '/test_install'
    let failed = false
    axios.default.get = jest.fn().mockReturnValue({ data: checksum })
    const progress = jest.fn()

    if (!existsSync(installDir)) {
      mkdirSync(installDir)
    }

    const destFileLink = `${installDir}/${fileLink.split('/').slice(-1)[0]}`
    if (!existsSync(destFileLink)) {
      copyFileSync(fileLink, destFileLink)
    }

    const releaseVersion: VersionInfo = {
      version: '1.2.3',
      type: 'wine-ge',
      date: '12/24/2021',
      download: `file:///${fileLink}`,
      downsize: 100,
      disksize: 0,
      checksum: '<to-checksum-file>'
    }
    await installVersion({
      versionInfo: releaseVersion,
      installDir: installDir,
      onProgress: progress
    })
      .then((response) => {
        expect(response.versionInfo).toBe(releaseVersion)
        expect(response.installDir).toBe(`${installDir}/test`)
      })
      .catch(() => {
        failed = true
      })

    if (existsSync(installDir)) {
      rmSync(installDir, { recursive: true })
    }

    if (failed) {
      throw Error('No error should be thrown!')
    }

    expect(axios.default.get).toBeCalledWith('<to-checksum-file>', {
      responseType: 'text'
    })

    expect(progress).toBeCalledWith('downloading', {
      percentage: expect.any(Number),
      avgSpeed: expect.any(Number),
      eta: expect.any(Number)
    })
    expect(progress).toBeCalledWith('unzipping')
    expect(progress).toBeCalledWith('idle')
  })
})
