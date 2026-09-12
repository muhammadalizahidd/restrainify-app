/* eslint-disable */
module.exports = {
  GoogleSignin: {
    configure: () => {},
    hasPlayServices: async () => true,
    signIn: async () => {
      throw new Error("Google sign-in is not available in node test environment");
    },
    signOut: async () => null,
    revokeAccess: async () => null,
    getTokens: async () => ({ idToken: "mock-id-token", accessToken: "mock-access-token" }),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED",
    IN_PROGRESS: "IN_PROGRESS",
    PLAY_SERVICES_NOT_AVAILABLE: "PLAY_SERVICES_NOT_AVAILABLE",
    SIGN_IN_REQUIRED: "SIGN_IN_REQUIRED",
  },
};
