/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
const config = {
  plugins: ['@trivago/prettier-plugin-sort-imports'],
  tabWidth: 2,
  semi: true,
  singleQuote: true,
  printWidth: 120,
  arrowParens: 'avoid',
  trailingComma: 'es5',
  importOrderParserPlugins: ['typescript', 'decorators-legacy'],
  importOrder: ['<THIRD_PARTY_MODULES>', '^oa-', '^([./])'],
  importOrderSeparation: true,
  importOrderSortSpecifiers: false,
  importOrderSideEffects: false,
};

export default config;
