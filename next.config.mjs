import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const libPath = resolve(__dirname, "lib/cdr-sdk");

const nextConfig = {
  serverExternalPackages: ["postgres", "bls-eth-wasm"],
  turbopack: {
    resolveAlias: {
      "@piplabs/cdr-contracts": "./lib/cdr-sdk/contracts/index.js",
      "@piplabs/cdr-crypto": "./lib/cdr-sdk/crypto/index.js",
      "@piplabs/cdr-sdk": "./lib/cdr-sdk/sdk/index.js",
    },
  },

  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@piplabs/cdr-contracts": resolve(libPath, "contracts"),
      "@piplabs/cdr-crypto": resolve(libPath, "crypto"),
      "@piplabs/cdr-sdk": resolve(libPath, "sdk"),
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
