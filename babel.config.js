module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // Must stay last in the plugins list (Reanimated 4 / react-native-worklets requirement).
    plugins: ["react-native-worklets/plugin"],
  };
};