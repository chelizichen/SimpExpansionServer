import ConfigParser from "@webantic/nginx-config-parser"
import { get } from "lodash"
import fs from "fs"
import path from "path"
import { getConf } from "../constant"
import { exec, execSync } from "child_process"
import { stdout } from "process"
export const parser = new ConfigParser()

export function NginxExpansion(upstreamConf: NginxExpansionDto) {
  const originConf = getCurrentConf()
  originConf.http[`upstream ${upstreamConf.upstreamName}`] = {
    server: upstreamConf.server
  }
  originConf.http.server[upstreamConf.locationName].proxy_pass =
    `http://${upstreamConf.upstreamName}`
  return parser.toConf(originConf)
}

export function getCurrentConf(path?: string | string[]) {
  const config = parser.readConfigFile(getConf().nginxPath, {
    parseIncludes: false
  })
  if (path) {
    if (typeof path == "string") {
      const arr = path.split(".")
      const getConf = get(config, arr)
      return getConf
    } else if (path instanceof Array) {
      const getConf = get(config, path)
      return getConf
    }
  } else {
    return config
  }
}

export function backupConfAndWriteNew(newConf: string) {
  return new Promise((resolve, reject) => {
    try {
      const isProd = process.env.SIMP_PRODUCTION === "Yes"
      const cwd = process.cwd()
      const rootPath = (isProd ? process.env.SIMP_SERVER_PATH : cwd) as string
      const backupConf = parser.toConf(getCurrentConf())
      const dirFiles = fs.readdirSync(
        path.resolve(rootPath, getConf().historyDir)
      )
      fs.writeFileSync(
        path.resolve(
          rootPath,
          getConf().historyDir,
          `nginx_${dirFiles.length}.conf`
        ),
        backupConf,
        "utf-8"
      )
      parser.writeConfigFile(getConf().nginxPath, newConf, true)
      const test = exec("nginx -t")
      let resu = ""
      test.stdout?.on("data", function (chunk) {
        resu += chunk.toString()
        console.log("stdout ::", chunk.toString())
      })
      test.stderr?.on("data", function (chunk) {
        console.log("stdout ::", chunk.toString())
        resu += chunk.toString()
      })
      test.on("close", function () {
        resolve(resu)
      })
    } catch (e) {
      reject(e)
    }
  })
}
