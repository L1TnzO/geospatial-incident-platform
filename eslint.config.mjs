const normalizeModule = (module) => module?.default ?? module;

const loadClientConfig = async () => {
  try {
    return normalizeModule(await import("./client/eslint.config.mjs"));
  } catch (error) {
    if (error?.code === "ERR_MODULE_NOT_FOUND") {
      return normalizeModule(await import("./client/eslint.config.js"));
    }

    throw error;
  }
};

const loadServerConfig = async () => normalizeModule(await import("./server/eslint.config.mjs"));

const clientConfigRaw = await loadClientConfig();
const serverConfigRaw = await loadServerConfig();

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
      "client-old/**",
      "client-ui-reference/**",
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
