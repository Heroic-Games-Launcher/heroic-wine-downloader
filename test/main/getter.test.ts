import { Repositorys } from '../../src/types'
import { VersionInfo } from '../../lib/types'
import { getAvailableVersions } from '../../src/main'
import { test_data_release_list } from '../test_data/github-api-test-data.json'
import * as axios from 'axios'

describe('Main - GetAvailableVersions', () => {
  test('fetch releases succesfully', async () => {
    axios.default.get = jest.fn().mockResolvedValue(test_data_release_list)

    // WINEGE
    await getAvailableVersions({ repositorys: [Repositorys.WINEGE] })
      .then((releases: VersionInfo[]) => {
        expect(releases).not.toBe([])
        expect(releases.length).toBeGreaterThan(0)
        expect(releases[2].version).toContain('6.16-GE-1')
      })
      .catch(() => {
        throw Error('No error should be thrown!')
      })

    expect(axios.default.get).toBeCalledWith(
      'https://api.github.com/repos/GloriousEggroll/wine-ge-custom/releases?per_page=100'
    )

    // PROTONGE
    await getAvailableVersions({ repositorys: [Repositorys.PROTONGE] })
      .then((releases: VersionInfo[]) => {
        expect(releases).not.toBe([])
        expect(releases.length).toBeGreaterThan(0)
        expect(releases[2].version).toContain('6.16-GE-1')
      })
      .catch(() => {
        throw Error('No error should be thrown!')
      })

    expect(axios.default.get).toBeCalledWith(
      'https://api.github.com/repos/GloriousEggroll/wine-ge-custom/releases?per_page=100'
    )
  })

  test('fetch releases failed because of 404', async () => {
    axios.default.get = jest.fn().mockRejectedValue('Could not fetch tag 404')

    // WINEGE
    await getAvailableVersions({ repositorys: [Repositorys.WINEGE] })
      .then(() => {
        throw Error("Function shouldn't success!")
      })
      .catch((error: Error) => {
        expect(error.message).toBe(
          'Could not fetch available releases from https://api.github.com/repos/GloriousEggroll/wine-ge-custom/releases with error:' +
            '\n Could not fetch tag 404'
        )
      })

    expect(axios.default.get).toBeCalledWith(
      'https://api.github.com/repos/GloriousEggroll/wine-ge-custom/releases?per_page=100'
    )

    // PROTONGE
    await getAvailableVersions({ repositorys: [Repositorys.PROTONGE] })
      .then(() => {
        throw Error("Function shouldn't success!")
      })
      .catch((error: Error) => {
        expect(error.message).toBe(
          'Could not fetch available releases from https://api.github.com/repos/GloriousEggroll/proton-ge-custom/releases with error:' +
            '\n Could not fetch tag 404'
        )
      })

    expect(axios.default.get).toBeCalledWith(
      'https://api.github.com/repos/GloriousEggroll/wine-ge-custom/releases?per_page=100'
    )
  })

  test('Invalid repository key returns nothing', async () => {
    axios.default.get = jest.fn()

    await getAvailableVersions({ repositorys: [2] })
      .then((releases: VersionInfo[]) => {
        expect(releases).toStrictEqual([])
        expect(releases.length).toBe(0)
      })
      .catch(() => {
        throw Error('No error should be thrown!')
      })

    expect(axios.default.get).not.toBeCalled()
  })
})
