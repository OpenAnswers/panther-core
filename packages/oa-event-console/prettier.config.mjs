import rootPrettierConfig from '../../prettier.root.mjs';

/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
const config = {
  ...rootPrettierConfig,
  importOrder: ['<THIRD_PARTY_MODULES>', '^oa-', '^([./])'],
};

export default config;
