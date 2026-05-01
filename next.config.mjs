import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const nodeProtoAliases = {
  "node:module": false,
  "node:fs": false,
  "node:path": false,
  "node:url": false,
  "node:crypto": false,
};

const nextConfig = {
  webpack: (config, { isServer }) => {
    const libPath = resolve(__dirname, "lib/cdr-sdk");

    config.resolve.alias = {
      ...config.resolve.alias,
      "@piplabs/cdr-contracts": resolve(libPath, "contracts"),
      "@piplabs/cdr-crypto": resolve(libPath, "crypto"),
      "@piplabs/cdr-sdk": resolve(libPath, "sdk"),
      ...(isServer ? {} : nodeProtoAliases),
    };

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }

    return config;
  },
};

export default nextConfig;