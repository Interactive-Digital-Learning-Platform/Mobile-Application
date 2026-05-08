import { 
  useAuth as useClerkAuth, 
  useSignIn as useClerkSignIn, 
  useSignUp as useClerkSignUp,
  useUser as useClerkUser
} from "@clerk/expo";

const bypassAuth = process.env.EXPO_PUBLIC_BYPASS_AUTH === "true";

export function useAuth() {
  if (bypassAuth) {
    return {
      isLoaded: true,
      isSignedIn: true,
      userId: "demo-user-id",
      getToken: async () => "demo-token",
      signOut: async () => {
        console.log("Mock Sign Out");
      },
    };
  }

  try {
    return useClerkAuth();
  } catch (e) {
    return { isLoaded: false, isSignedIn: false };
  }
}

export function useSignIn() {
  if (bypassAuth) {
    return {
      isLoaded: true,
      signIn: {
        create: async () => ({ status: "complete" }),
        prepareFirstFactor: async () => ({ status: "complete" }),
        attemptFirstFactor: async () => ({ status: "complete" }),
      },
      setActive: async () => {},
    };
  }

  try {
    return useClerkSignIn();
  } catch (e) {
    return { isLoaded: false };
  }
}

export function useSignUp() {
  if (bypassAuth) {
    return {
      isLoaded: true,
      signUp: {
        create: async () => ({ status: "complete" }),
        prepareVerification: async () => ({ status: "complete" }),
        attemptVerification: async () => ({ status: "complete" }),
      },
      setActive: async () => {},
    };
  }

  try {
    return useClerkSignUp();
  } catch (e) {
    return { isLoaded: false };
  }
}

export function useUser() {
  if (bypassAuth) {
    return {
      isLoaded: true,
      isSignedIn: true,
      user: {
        id: "demo-user-id",
        firstName: "Demo",
        lastName: "User",
        emailAddresses: [{ emailAddress: "demo@example.com" }],
        imageUrl: "https://via.placeholder.com/150",
      },
    };
  }

  try {
    return useClerkUser();
  } catch (e) {
    return { isLoaded: false, isSignedIn: false, user: null };
  }
}
