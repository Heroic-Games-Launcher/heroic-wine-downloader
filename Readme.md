# heroic-wine-downloader

This library is a helper to fetch and download available wine binaries (e.g.
[Wine-GE](https://github.com/GloriousEggroll/wine-ge-custom/releases),
[Proton-GE](https://github.com/GloriousEggroll/proton-ge-custom/releases),
[Wine-Lutris](https://github.com/lutris/wine/releases/tag/lutris-ge-lol-6.16-4),
...).

Following tools should be installed on the system, to make the package fully functional:

- **curl**: needed to download the binary archive
- **tar**: needed to unpack the binary archive
- **du (optional)**: needed to get the unpacked binary size on the disk

<br>

## Install

```
$ npm install heroic-wine-downloader
```

or

```
$ yarn add heroic-wine-downloader
```

##

## Usage

```typescript
import {
  getAvailableVersions,
  Repository,
  VersionInfo,
  State,
  ProgressInfo
} from 'heroic-wine-downloader'

// get binaries of Wine GE
getAvailableVersions({ repositorys: [Repository.WINEGE] })
  .then((versions: VersionInfo[]) => {
    // install newest
    installVersion({
      versionInfo: versions[0],
      installDir: '<valid-path>',
      onProgress: (state: State, progress: ProgressInfo => {
        console.log(
          `onProgress: state = ${state}, progress = ${progress.percentage}`
        )
      })
      .then((response: {version: VersionInfo, installDir: string}) => console.log(response.installDir))
      .catch((error: Error) => console.log(error.message))
  })
  .catch((error: Error) => {
    console.error(error.message)
  })
```
