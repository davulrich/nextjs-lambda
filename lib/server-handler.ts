process.env.NODE_ENV = "production"
process.chdir(__dirname)

import NextServer from "next/dist/server/next-server"
import slsHttp from "serverless-http"
import path from "path"
import { ServerResponse } from "http"

// This will be loaded from custom config parsed via CLI.
const nextConf = require(`${process.env.NEXT_CONFIG_FILE ?? "./config.json"}`)

// Make sure commands gracefully respect termination signals (e.g. from Docker)
// Allow the graceful termination to be manually configurable
if (!process.env.NEXT_MANUAL_SIG_HANDLE) {
  process.on("SIGTERM", () => process.exit(0))
  process.on("SIGINT", () => process.exit(0))
}

const config = {
  hostname: "localhost",
  port: Number(process.env.PORT) || 3000,
  dir: path.join(__dirname),
  dev: false,
  customServer: false,
  conf: nextConf,
}

const nextHandler = new NextServer(config).getRequestHandler()

const server = slsHttp(
  async (req: any, res: ServerResponse) => {
    await nextHandler(req, res).catch((e) => {
      // Log into Cloudwatch for easier debugging.
      console.error(`NextJS request failed due to:`)
      console.error(e)

      res.setHeader("Content-Type", "application/json")
      res.end(
        JSON.stringify(
          {
            message: "Server failed to respond.",
            details: e,
          },
          // Prettified.
          null,
          3
        )
      )
    })
  },
  {
    // We have separate function for handling images. Assets are handled by S3.
    binary: false,
  }
)

export const handler = server