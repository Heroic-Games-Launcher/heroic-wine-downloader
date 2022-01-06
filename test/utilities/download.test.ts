import { existsSync, mkdirSync, rmdirSync } from 'graceful-fs'
import { downloadFile } from '../../src/utilities'

describe('Utilities - Downlaod', () => {
  test('download file fails because of invalid installDir', async () => {
    const progress = jest.fn()
    await downloadFile({
      link: '',
      downloadDir: 'invalid',
      onProgress: progress
    })
      .then(() => {
        throw Error('No error should be thrown!')
      })
      .catch((error) => {
        expect(error).toBe('Download path invalid does not exist!')
      })
  })

  test('download file fails because of installDir is a file', async () => {
    const progress = jest.fn()
    await downloadFile({
      link: '',
      downloadDir: __filename,
      onProgress: progress
    })
      .then(() => {
        throw Error('No error should be thrown!')
      })
      .catch((error) => {
        expect(error).toBe(
          'Download path /home/niklas/Repository/wine-proton-downloader/test/utilities/download.test.ts is not a directory!'
        )
      })
  })

  test('download file succeed', async () => {
    const progress = jest.fn()
    const installDir = __dirname + '/test_download'
    let failed = false

    if (!existsSync(installDir)) {
      mkdirSync(installDir)
    }

    await downloadFile({
      link: `file:///${__dirname}/../test_data/test.tar.xz`,
      downloadDir: installDir,
      onProgress: progress
    })
      .then((response) => {
        expect(response).toBe(
          'Succesfully downloaded file:////home/niklas/Repository/wine-proton-downloader/test/utilities/../test_data/test.tar.xz to /home/niklas/Repository/wine-proton-downloader/test/utilities/test_download/test.tar.xz.'
        )
      })
      .catch(() => {
        failed = true
      })

    if (existsSync(installDir)) {
      rmdirSync(installDir, { recursive: true })
    }

    if (failed) {
      throw Error('No error should be thrown!')
    }

    expect(progress).toBeCalledWith('downloading', { percentage: 0 })
    expect(progress).toBeCalledWith('downloading', {
      percentage: expect.any(Number)
    })
    expect(progress).toBeCalledWith('idle')
  })
})
