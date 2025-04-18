module.exports = {
    webpack: (config, { isServer }) => {
      config.cache = false;
      return config;
    },
  };
  