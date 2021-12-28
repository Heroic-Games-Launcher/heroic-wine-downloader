import * as axios from "axios";
import { statSync, unlinkSync } from "graceful-fs";
import { spawnSync, spawn } from "child_process";

import { logError, logInfo } from "./logger";
import { ProgressInfo, State, VersionInfo } from "./types";

interface Props {
  url: string;
  isWine: boolean;
  isGE: boolean;
  count: number;
}

async function fetchReleases({ url, isWine, isGE, count }: Props) {
  const releases = {} as VersionInfo[];

  return new Promise(async (resolve, reject) => {
    try {
      logInfo(`Fetch releases from ${url}`);
      const data = await axios.default.get(url + "?per_page=" + count);

      for (const release of data.data) {
        const release_data = {} as VersionInfo;
        release_data.version = release.tag_name;
        release_data.type = isWine ? "wine" : "proton";
        release_data.isGE = isGE;
        release_data.date = release.published_at.split("T")[0];
        release_data.disksize = 0;

        for (const asset of release.assets) {
          if (asset.name.endsWith("sha512sum")) {
            release_data.checksum = asset.browser_download_url;
          } else if (
            asset.name.endsWith("tar.gz") ||
            asset.name.endsWith("tar.xz")
          ) {
            release_data.download = asset.browser_download_url;
            release_data.downsize = asset.size;
          }
        }

        releases.push(release_data);
      }
    } catch (error) {
      reject(
        `Could not fetch available releases from ${url} with error:\n ${error}`
      );
    }

    resolve(releases);
  });
}

function unlinkFile(filePath: string) {
  try {
    unlinkSync(filePath);
    return true;
  } catch (error) {
    logError(error);
    logError(`Failed to remove ${filePath}!`);
    return false;
  }
}

function getFolderSize(folder: string) {
  const { stdout } = spawnSync("du", ["-sb", folder]);
  return parseInt(stdout.toString());
}

async function downloadFile(
  link: string,
  downloadDir: string,
  onProgress: (state: State, progress?: ProgressInfo) => void
) {
  return new Promise((resolve, reject) => {
    if (!statSync(downloadDir).isDirectory()) {
      reject(`Download path ${downloadDir} is not a directory!`);
    }

    let percentage = 0;
    let downspeed = 0;
    const filePath = downloadDir + "/" + link.split("/").slice(-1)[0];
    const download = spawn("curl", ["-L", link, "-o", filePath]);

    download.stdout.on("data", function (stdout) {
      // curl does somehow print on stderr
      // progress calculation is done on stderr
      logInfo(stdout.toString());
    });

    download.stderr.on("data", function (stderr) {
      // get info from curl output
      const info = stderr.toString().trimStart().split(" ");
      const newPercentage = parseInt(info[0]);
      const newDownSpeed = stderr.toString(info[6]);

      // check if percentage is valid
      percentage = !isNaN(newPercentage) ? newPercentage : percentage;

      // check if speed is valid and convert to Bytes per second
      if (newDownSpeed.includes("M")) {
        const tmpSpeed = parseInt(newDownSpeed) * 1024 * 1024;
        downspeed = !isNaN(tmpSpeed) ? tmpSpeed : downspeed;
      } else if (newDownSpeed.includes("K")) {
        const tmpSpeed = parseInt(newDownSpeed) * 1024;
        downspeed = !isNaN(tmpSpeed) ? tmpSpeed : downspeed;
      } else {
        const tmpSpeed = parseInt(newDownSpeed);
        downspeed = !isNaN(tmpSpeed) ? tmpSpeed : downspeed;
      }

      onProgress("downloading", {
        downspeed: downspeed,
        percentage: percentage,
      });
    });

    download.on("close", function (exitcode: number) {
      onProgress('idle')
      if (exitcode !== 0) {
        reject(`Download of ${link} failed with exit code ${exitcode}!`);
      }

      resolve(`Succesfully downloaded ${link} to ${filePath}.`);
    });
  });
}

async function unzipFile(
  filePath: string,
  unzipDir: string,
  onProgress: (state: State, progress?: ProgressInfo) => void
) {
  return new Promise((resolve, reject) => {
    if (statSync(filePath).isDirectory()) {
      reject(`Archive path ${filePath} is not a file!`);
    }

    let extension_options = "";
    if (filePath.endsWith("tar.gz")) {
      extension_options = "-vzxf";
    } else if (filePath.endsWith("tar.xz")) {
      extension_options = "-vJxf";
    } else {
      reject(`Archive type ${filePath.split(".").pop()} not supported!`);
    }

    const unzip = spawn("tar", [
      "--directory",
      unzipDir,
      "--strip-components=1",
      extension_options,
      filePath,
    ]);

    unzip.stdout.on("data", function () {
      onProgress('unzipping');
    });

    unzip.stderr.on("data", function (stderr: string) {
      onProgress('idle');
      reject(stderr);
    });

    unzip.on("close", function (exitcode: number) {
      onProgress('idle');
      if (exitcode !== 0) {
        reject(
          `Unzip of ${filePath} failed with exit code ${exitcode}!`
        );
      }

      resolve(`Succesfully unzip ${filePath} to ${unzipDir}.`);
    });
  });
}

export { fetchReleases, unlinkFile, getFolderSize, downloadFile, unzipFile };
