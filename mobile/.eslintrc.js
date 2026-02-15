module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    'react/no-unstable-nested-components': ['warn', { allowAsProps: true }],
  },
  overrides: [
    {
      files: ['jest.setup.js', '__mocks__/**/*.js'],
      env: { jest: true },
    },
  ],
};
