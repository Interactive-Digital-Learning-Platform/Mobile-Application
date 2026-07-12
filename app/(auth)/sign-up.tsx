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
import { userSignupSchema } from "@/schemas/userSchemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSignUp } from "@clerk/expo";
import { signUpFormValues } from "@/types/chatModuleTypes";
import Toast from "react-native-toast-message";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

export default function Signup() {
  const navigation = useNavigation();

  const { signUp, fetchStatus } = useSignUp();

  const {
    control,
    handleSubmit,
    formState: { isSubmitting, isValid },
  } = useForm<z.infer<typeof userSignupSchema>>({
    resolver: zodResolver(userSignupSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
      username: "",
    },
  });

  const onSubmit = async (formData: signUpFormValues) => {
    const { error } = await signUp.password({
      emailAddress: formData.email,
      password: formData.password,
      username: formData.username
    });

    if (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message,
      });

      return;
    }

    await signUp.verifications.sendEmailCode();

    router.push({
      pathname: "/(auth)/verify-email",
      params: { email: formData.email, username: formData.username },
    });
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
              Let's Get Started 👋
            </Text>
            <Text className="text-lg font-aregular text-[#979797]">
              Fill the form to continue
            </Text>
          </View>
          <View className="mt-10 w-full flex-col justify-start items-center gap-5">
            <Controller
              control={control}
              name="username"
              render={({ field: { onChange, value } }) => (
                <InputField
                  title="Enter an username"
                  keyboardType="default"
                  handleChange={onChange}
                  value={value}
                  placeHolder="John Doe"
                />
              )}
            />
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
                  title="Choose a password"
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
              title="Sign up"
              handlePress={handleSubmit(onSubmit)}
              isLoading={isSubmitting || !isValid || fetchStatus === "fetching"}
            />
          </View>
          <View className="mt-5 justify-center items-center">
            <Text className="font-amedium text-xl">OR</Text>
          </View>
          <View className="mt-5">
            <CustomButton
              title="Sign up with Google"
              handlePress={() => router.push("/(auth)/verify-email")}
              image={icons.google_icon}
              backgroundColor="white"
              textStyles={{ color: colors.primaryBlack }}
              borderColor={colors.borderColorLight}
            />
          </View>
          <View className="mt-8 flex-row gap-2 justify-center items-center mb-8">
            <Text className="font-amedium text-lg text-[#979797]">
              Already have an account?
            </Text>
            <Pressable onPress={() => router.push("/(auth)/sign-in")}>
              <Text className="font-amedium text-lg underline">Login</Text>
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