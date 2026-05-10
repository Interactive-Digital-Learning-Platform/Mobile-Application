import CustomButton from "@/components/CustomButton";
import Header from "@/components/Header";
import InputField from "@/components/InputField";
import { colors } from "@/constants/colors";
import icons from "@/constants/icons";
import { router, useNavigation } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import z from "zod";
import { userSignInSchema } from "@/schemas/userSchemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth, useSignIn, useUser } from "@/hooks/clerk-mock";
import { type signInFormValues } from "@/types";
import Toast from "react-native-toast-message";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useEffect } from "react";
// import { useUser } from "@clerk/expo";
import { syncUserWithBackend } from "@/services/authService";

export default function Signin() {
  const navigation = useNavigation();

  const { signIn, fetchStatus } = useSignIn();

  const {
    control,
    handleSubmit,
    formState: { isSubmitting, isValid },
  } = useForm<z.infer<typeof userSignInSchema>>({
    resolver: zodResolver(userSignInSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (formData: signInFormValues) => {
    const { error } = await signIn.password({
      emailAddress: formData.email,
      password: formData.password,
    });

    if (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message,
      });

      return;
    }

    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: async ({ session }) => {
          if (session?.user) {
            // Sync with our backend
            try {
              await syncUserWithBackend({
                clerkId: session.user.id,
                name: session.user.username || session.user.firstName || "Student",
                email: session.user.primaryEmailAddress?.emailAddress || formData.email,
              });
            } catch (err) {
              console.error("Backend sync failed:", err);
            }
          }
          
          if (session?.currentTask) {
            console.log("Current task: ", session?.currentTask);
            return;
          }

          router.push("/(tabs)/ai");
        },
      });
    } else {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Signin attempt not completed!",
      });
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAwareScrollView
        bottomOffset={10}
        className="w-full flex flex-1"
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full flex-1 relative">
          {navigation.canGoBack() && <Header />}
          <View className="py-4 flex-col justify-center items-start">
            <Text className="text-4xl font-asemibold text-[#0F172A]">
              Welcome Back ✌️
            </Text>
            <Text className="text-lg font-aregular text-[#979797]">
              Just a few details and you’re in
            </Text>
          </View>
          <View className="mt-10 w-full flex-col justify-start items-center gap-5">
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <InputField
                  title="Your email address"
                  keyboardType="email-address"
                  handleChange={onChange}
                  value={value}
                  placeHolder="johndoe@gmail.com"
                />
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <InputField
                  title="Your password"
                  keyboardType="password"
                  handleChange={onChange}
                  value={value}
                  placeHolder="xxxxxxxxx"
                />
              )}
            />
          </View>
          <View className="mt-8 justify-center items-center">
            <CustomButton
              title="Sign in"
              handlePress={handleSubmit(onSubmit)}
              isLoading={isSubmitting || !isValid || fetchStatus === "fetching"}
            />
          </View>
          <View className="mt-5 justify-center items-center">
            <Text className="font-amedium text-xl">OR</Text>
          </View>
          <View className="mt-5">
            <CustomButton
              title="Bypass Login (Example User)"
              handlePress={() => {
                syncUserWithBackend({
                  clerkId: "mock_clerk_id_123",
                  name: "Test User",
                  email: "testuser@example.com",
                }).then(() => router.push("/(tabs)/ai"));
              }}
              backgroundColor={colors.primary}
              textStyles={{ color: "white" }}
            />
          </View>
          <View className="mt-5">
            <CustomButton
              title="Sign in with Google"
              handlePress={() => router.push("/(auth)/verify-email")}
              image={icons.google_icon}
              backgroundColor="white"
              textStyles={{ color: colors.primaryBlack }}
              borderColor={colors.borderColorLight}
            />
          </View>
          <View className="mt-8 flex-row gap-2 justify-center items-center mb-8">
            <Text className="font-amedium text-lg text-[#979797]">
              Don't have an account?
            </Text>
            <Pressable onPress={() => router.push("/(auth)/sign-up")}>
              <Text className="font-amedium text-lg underline">Signup</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "relative",
    width: "100%",
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
});
