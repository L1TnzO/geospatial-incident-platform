import clientConfigRaw from "./client/eslint.config.js";
import serverConfigRaw from "./server/eslint.config.mjs";

const toArray = (value) => (Array.isArray(value) ? value : [value]);

const prefixPattern = (pattern, prefix) => {
  if (typeof pattern !== "string") {
    return pattern;
  }

  if (pattern.startsWith(prefix)) {
    return pattern;
  }

  if (pattern.startsWith("!/")) {
    return `!${prefix}/${pattern.slice(2)}`;
  }

  if (pattern.startsWith("!")) {
    return `!${prefix}/${pattern.slice(1)}`;
  }

  if (pattern.startsWith("./")) {
    return `${prefix}/${pattern.slice(2)}`;
  }

  return `${prefix}/${pattern}`;
};

const scopeConfigs = (rawConfig, prefix) =>
  toArray(rawConfig).map((config) => {
    const next = { ...config };

    if (config.files) {
      next.files = config.files.map((pattern) => prefixPattern(pattern, prefix));
    } else {
      next.files = [`${prefix}/**/*`];
    }

    if (config.ignores) {
      next.ignores = config.ignores.map((pattern) => prefixPattern(pattern, prefix));
    }

    return next;
  });

const clientConfigs = scopeConfigs(clientConfigRaw, "client");
const serverConfigs = scopeConfigs(serverConfigRaw, "server");

export default [
  {
    ignores: [
      "node_modules/**",
      "client/node_modules/**",
      "server/node_modules/**",
      "client/dist/**",
      "server/dist/**",
      "coverage/**",
      ".husky/_/**",
    ],
  },
  ...clientConfigs,
  ...serverConfigs,
];
