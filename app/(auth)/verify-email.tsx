import Header from "@/components/Header";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  CodeField,
  Cursor,
  useBlurOnFulfill,
  useClearByFocusCell,
} from "react-native-confirmation-code-field";
import CustomButton from "@/components/CustomButton";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth, useSignUp } from "@/hooks/useAuth";
import { Controller, useForm } from "react-hook-form";
import z from "zod";
import { emailVerificationSchema } from "@/schemas/userSchemas";
import { zodResolver } from "@hookform/resolvers/zod";
import Toast from "react-native-toast-message";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useEffect } from "react";

export default function VerifyEmail() {
  const params = useLocalSearchParams();

  const { email } = params;

  const { signUp, fetchStatus } = useSignUp();
  const { isSignedIn } = useAuth();

  useEffect(() => {
    if (signUp?.status === "complete" || isSignedIn) {
      router.push("/(tabs)/ai");
      return;
    }
  }, [signUp?.status, isSignedIn]);

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
    await signUp.verifications.verifyEmailCode({
      code: data.code,
    });

    if (signUp.status === "complete") {
      await signUp.finalize({
        navigate: ({ session }) => {
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
        text2: "Signup attempt not completed!",
      });
    }
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
                Let's Verify Your email
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
              render={({ field: { value, onChange } }) => {
                const ref = useBlurOnFulfill({ value, cellCount: 6 });
                const [props, getCellOnLayoutHandler] = useClearByFocusCell({
                  value,
                  setValue: onChange,
                });

                return (
                  <CodeField
                    ref={ref}
                    {...props}
                    value={value}
                    onChangeText={onChange}
                    cellCount={6}
                    rootStyle={styles.codeFieldRoot}
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    testID="my-code-input"
                    renderCell={({ index, symbol, isFocused }) => (
                      <Text
                        key={index}
                        style={[styles.cell, isFocused && styles.focusCell]}
                        onLayout={getCellOnLayoutHandler(index)}
                      >
                        {symbol || (isFocused && <Cursor />)}
                      </Text>
                    )}
                  />
                );
              }}
            />
          </View>
        </View>
        <View style={styles.buttonContainer}>
          <CustomButton
            title="Verify"
            handlePress={handleSubmit(verifyEmail)}
            isLoading={isSubmitting || !isValid || fetchStatus === "fetching"}
          />
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  codeFieldRoot: {
    marginTop: 35,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  cell: {
    width: 50,
    height: 50,
    lineHeight: 45,
    fontSize: 24,
    fontFamily: "Author-Medium",
    borderWidth: 2,
    borderColor: "#00000030",
    textAlign: "center",
    color: "#000",
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  focusCell: {
    borderColor: "#000",
  },
  buttonContainer: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    bottom: 16,
  },
});
