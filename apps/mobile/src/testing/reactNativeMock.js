/* eslint-disable */
module.exports = {
  Platform: { OS: "android" },
  StyleSheet: {
    create: (styles) => styles,
    hairlineWidth: 1,
  },
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  NativeModules: {
    RestrainifyProtectionBridge: null,
  },
  NativeEventEmitter: class {
    addListener() {
      return { remove: () => {} };
    }
  },
  Alert: {
    alert: () => {},
  },
};
