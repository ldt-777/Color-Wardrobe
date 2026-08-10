module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // react-native-reanimated 4 delega il worklet-ing a react-native-worklets:
    // questo plugin deve restare l'ultimo della lista.
    plugins: ['react-native-worklets/plugin'],
  };
};
