import * as axios from "axios";
import * as crypto from 'crypto';
import { existsSync, mkdirSync, readFileSync, rmdirSync } from "graceful-fs";

import { WINEGE_URL, PROTONGE_URL } from "./constants";
import { VersionInfo, Repositorys, State, ProgressInfo } from "./types";
import { logInfo, logWarning } from "./logger";
import {
  downloadFile,
  fetchReleases,
  getFolderSize,
  unlinkFile,
  unzipFile,
} from "./utilities";

/**
 * Fetch all available releases of all or given repositorys
 * @param repositorys TODO
 * @param count max releases to fetch for (default: 100)
 * @returns Info Array of available releases
 */
async function getAvailableVersions(
  repositorys: Repositorys[] = [Repositorys.WINEGE, Repositorys.PROTONGE],
  count: number = 100
): Promise<VersionInfo[]> {
  const releases = {} as VersionInfo[];

  return new Promise((resolve, reject) => {
    repositorys?.forEach(async (repo: Repositorys) => {
      switch (repo) {
        case Repositorys.WINEGE: {
          await fetchReleases({
            url: WINEGE_URL,
            isWine: true,
            isGE: true,
            count: count,
          })
            .then((fetchedReleases: VersionInfo[]) => {
              releases.push(...fetchedReleases);
            })
            .catch((error: string) => {
              reject(error);
            });
          break;
        }
        case Repositorys.PROTONGE: {
          await fetchReleases({
            url: PROTONGE_URL,
            isWine: false,
            isGE: true,
            count: count,
          })
            .then((fetchedReleases: VersionInfo[]) => {
              releases.push(...fetchedReleases);
            })
            .catch((error: string) => {
              reject(error);
            });
          break;
        }
        default: {
          logWarning(
            `Unknown and not supported repository key passed! Skip fetch for ${repo}`
          );
          break;
        }
      }
    });

    resolve(releases);
  });
}

/**
 * TODO
 * @param release
 * @param onDownloadProgress
 * @param onUnzipProgress
 * @returns
 */
async function installVersion(
  versionInfo: VersionInfo,
  installDir: string,
  overwrite = false,
  onProgress = (state: State, progress?: ProgressInfo) => {
    logInfo(progress.percentage.toString());
  }
): Promise<{ versionInfo: VersionInfo; installDir: string }> {
  return new Promise(async (resolve, reject) => {
    // Check if installDir exist
    if (!existsSync(installDir)) {
      reject(`Installation directory ${installDir} doesn't exist!`);
    }

    // check versionInfo has download
    if (!versionInfo.download) {
      reject(`No download link provided for ${versionInfo.version}!`);
    }

    // get name of the wine folder to install the selected version
    const folderNameParts = versionInfo.download
      .split("/") // split path
      .slice(-1)[0] // get the archive name
      .split(".") // split dots
      .slice(0, -2); // remove the archive extensions (tar.xz or tar.gz)
    const installSubDir = installDir + "/" + folderNameParts.join(".");

    const sourceChecksum = versionInfo.checksum
      ? (
          await axios.default.get(versionInfo.checksum, {
            responseType: "text",
          })
        ).data
      : undefined;

    // Check if it already exist
    if (existsSync(installSubDir) && !overwrite) {
      logWarning(`${versionInfo.version} is already installed. Skip installing! \n
      Consider using 'override: true if you wan't to override it!'`);

      // resolve with disksize
      versionInfo.disksize = getFolderSize(installSubDir);
      resolve({ versionInfo: versionInfo, installDir: installSubDir });
    }

    // Prepare destination where to download tar file
    const tarFile =
      installDir + "/" + versionInfo.download.split("/").slice(-1)[0];

    if (existsSync(tarFile)) {
      if (!unlinkFile(tarFile)) {
        reject(`Couldn't unlink already existing archive ${tarFile}!`);
      }
    }

    // Download
    await downloadFile(versionInfo.download, installDir, onProgress)
      .then((response: string) => {
        logInfo(response);
      })
      .catch((error: string) => {
        unlinkFile(tarFile);
        reject(`Download of ${versionInfo.version} failed with:\n ${error}`);
      });

    // Check if download checksum is correct
    const fileBuffer = readFileSync(tarFile);
    const hashSum = crypto.createHash("sha512");
    hashSum.update(fileBuffer);

    const downloadChecksum = hashSum.digest("hex");
    if (!sourceChecksum.includes(downloadChecksum)) {
      unlinkFile(tarFile);
      reject("Checksum verification failed");
    }

    // Unzip
    if (existsSync(installSubDir)) {
      try {
        rmdirSync(installSubDir, { recursive: true });
      } catch (error) {
        unlinkFile(tarFile);
        reject(`Failed to remove already existing folder ${installSubDir} with:\n ${error}`);
      }
    }

    try {
      mkdirSync(installSubDir);
    } catch (error) {
      unlinkFile(tarFile);
      reject(`Failed to make folder ${installSubDir} with:\n ${error}`);
    }

    await unzipFile(tarFile, installDir, onProgress)
      .then((response: string) => {
        logInfo(response);
      })
      .catch((error: string) => {
        rmdirSync(installSubDir, { recursive: true });
        unlinkFile(tarFile);
        reject(`Unzip of ${tarFile.split("/").slice(-1)[0]} failed with:\n ${error}`);
      });

    // clean up
    unlinkFile(tarFile);

    // resolve with disksize
    versionInfo.disksize = getFolderSize(installSubDir);
    resolve({ versionInfo: versionInfo, installDir: installSubDir });
  });
}

export { getAvailableVersions, installVersion };
