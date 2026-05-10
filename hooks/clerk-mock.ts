export const useUser = () => {
  return {
    isLoaded: true,
    isSignedIn: true,
    user: {
      id: "mock_clerk_id_123",
      username: "testuser",
      fullName: "Test User",
      primaryEmailAddress: { emailAddress: "testuser@example.com" },
    },
  };
};

export const useAuth = () => {
  return {
    isLoaded: true,
    isSignedIn: true,
    userId: "mock_clerk_id_123",
    signOut: async () => console.log("Sign out mocked"),
  };
};

export const useClerk = () => {
  return {
    signOut: async () => console.log("Sign out mocked"),
  };
};

export const useSignIn = () => {
  return {
    signIn: {
      password: async () => ({ error: null }),
      finalize: async ({ navigate }: any) => {
        await navigate({
          session: {
            user: {
              id: "mock_clerk_id_123",
              username: "testuser",
              primaryEmailAddress: { emailAddress: "testuser@example.com" },
            },
          },
        });
      },
      status: "complete",
    },
    fetchStatus: "idle",
  };
};

export const useSignUp = () => {
  return {
    signUp: {
      create: async () => ({ error: null }),
      prepareEmailAddressVerification: async () => ({ error: null }),
      attemptEmailAddressVerification: async () => ({ error: null }),
      status: "complete",
    },
    fetchStatus: "idle",
  };
};
