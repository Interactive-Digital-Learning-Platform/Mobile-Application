import Header from "@/components/Header";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomButton from "@/components/CustomButton";
import OtpCodeField from "@/components/auth/OtpCodeField";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth, useSignUp } from "@clerk/expo";
import { Controller, useForm } from "react-hook-form";
import {z} from "zod";
import { emailVerificationSchema } from "@/schemas/userSchemas";
import { zodResolver } from "@hookform/resolvers/zod";
import Toast from "react-native-toast-message";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useEffect, useRef, useState } from "react";

export default function VerifyEmail() {
  const params = useLocalSearchParams();

  const { email } = params;

  const { signUp, fetchStatus } = useSignUp();
  const { isSignedIn } = useAuth();

  const [phase, setPhase] = useState<"idle" | "verifying" | "settled">("idle");
  const verifyErrorRef = useRef<string | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    if (isSignedIn) {
      router.replace("/(tabs)/ai");
      return;
    }

    if (phase !== "settled" || handledRef.current) return;

    const currentSignUp = signUp;
    const status = currentSignUp?.status;

    if (currentSignUp && status === "complete") {
      handledRef.current = true;

      let cancelled = false;
      (async () => {
        const { error } = await currentSignUp.finalize({
          navigate: ({ session }) => {
            if (session?.currentTask) {
              console.log("Current task: ", session?.currentTask);
              return;
            }

            router.replace("/(tabs)/ai");
          },
        });

        if (error && !cancelled) {
          handledRef.current = false;
          setPhase("idle");
          Toast.show({
            type: "error",
            text1: "Error",
            text2: "Could not complete sign up. Please try again.",
          });
        }
      })();

      return () => {
        cancelled = true;
      };
    }

    handledRef.current = true;
    setPhase("idle");
    Toast.show({
      type: "error",
      text1: "Verification failed",
      text2:
        verifyErrorRef.current ??
        "The code you entered is incorrect or has expired.",
    });
  }, [signUp, isSignedIn, phase]);

  const {
    control,
    handleSubmit,
    formState: { isValid, isSubmitting },
  } = useForm<z.infer<typeof emailVerificationSchema>>({
    resolver: zodResolver(emailVerificationSchema),
    mode: "onChange",
    defaultValues: {
      code: "",
    },
  });

  const verifyEmail = async (data: { code: string }) => {
    if (!signUp || phase === "verifying") return;

    handledRef.current = false;
    verifyErrorRef.current = null;
    setPhase("verifying");

    const { error } = await signUp.verifications.verifyEmailCode({
      code: data.code,
    });

    verifyErrorRef.current = error?.message ?? null;
    setPhase("settled");
  };

  return (
    <SafeAreaView className="w-full flex-1 px-4">
      <KeyboardAwareScrollView
        bottomOffset={10}
        showsVerticalScrollIndicator={false}
        className="w-full flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View className="w-full flex-1">
          <View className="w-full h-auto">
            <Header title="Verify email address" />
          </View>
          <View className="w-full mt-10">
            <View className="w-full flex-col justify-center items-center gap-3">
              <Text className="text-4xl font-asemibold">
                Let&apos;s Verify Your email
              </Text>
              <Text className="font-aregular text-lg text-justify leading-tight text-[#979797]">
                We’ve sent a verification code to your email address. Please
                enter the code below to confirm your account.
              </Text>
              <View className="w-full flex-row justify-between items-center mt-5">
                <Text className="text-xl font-amedium">{email}</Text>
                <Pressable>
                  <Text className="text-xl font-amedium text-[#abc4ff]">
                    Resend
                  </Text>
                </Pressable>
              </View>
            </View>
            <Controller
              name="code"
              control={control}
              render={({ field: { value, onChange } }) => (
                <OtpCodeField value={value} onChange={onChange} />
              )}
            />
          </View>
        </View>
        <View style={styles.buttonContainer}>
          <CustomButton
            title="Verify"
            handlePress={handleSubmit(verifyEmail)}
            isLoading={
              isSubmitting ||
              !isValid ||
              fetchStatus === "fetching" ||
              phase !== "idle"
            }
          />
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    bottom: 16,
  },
});
