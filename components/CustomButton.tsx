import { StyleSheet, Text, TouchableOpacity, Image, View } from "react-native";
import { customButtonType } from "@/types/chatModuleTypes";

const CustomButton = ({
  title,
  handlePress,
  buttonStyles,
  isLoading,
  textStyles,
  image,
  backgroundColor,
  borderColor,
}: customButtonType) => {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        buttonStyles,
        isLoading ? { opacity: 0.5 } : { opacity: 1 },
        backgroundColor ? { backgroundColor } : { backgroundColor: "#0F172A" },
        borderColor && { borderColor, borderWidth: 1 },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={isLoading}
    >
      {image && (
        <View className="w-[24px] h-[24px] justify-center items-center">
          <Image
            source={image}
            resizeMode="contain"
            className="w-full h-full"
          />
        </View>
      )}
      <Text style={[styles.buttonText, textStyles]}>{title}</Text>
    </TouchableOpacity>
  );
};

export default CustomButton;

const styles = StyleSheet.create({
  button: {
    width: "100%",
    height: 54,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  buttonText: {
    fontSize: 18,
    color: "white",
    fontFamily: "Author-Medium",
  },
});
