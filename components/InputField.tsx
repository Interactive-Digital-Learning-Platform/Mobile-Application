import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TextStyle,
  TouchableOpacity,
  Image,
} from "react-native";
import React, { useState } from "react";
import icons from "@/constants/icons";

export type formFieldType = {
  title: string;
  value?: string;
  handleChange: (text: string) => void;
  keyboardType: string;
  otherStyles?: TextStyle;
  placeHolder: string;
};

const InputField = ({
  title,
  value,
  handleChange,
  keyboardType,
  placeHolder,
  otherStyles,
}: formFieldType) => {
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [passwordVisible, setpasswordVisible] = useState<boolean>(false);

  return (
    <View style={[styles.root]}>
      <Text style={[styles.fieldText, otherStyles]}>{title}</Text>
      <View style={[styles.container, isFocused && styles.textInputFocused]}>
        <TextInput
          style={[styles.textInput]}
          value={value}
          onChangeText={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeHolder}
          placeholderTextColor="#979797"
          secureTextEntry={keyboardType === "password" && !passwordVisible}
          keyboardType={
            keyboardType === "email-address" ? "email-address" : "default"
          }
        />
        {keyboardType === "password" && (
          <TouchableOpacity
            style={styles.iconContainer}
            onPress={() => setpasswordVisible((prev) => !prev)}
          >
            <Image
              style={styles.eyeIcon}
              source={passwordVisible ? icons.eye : icons.eye_hide}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default InputField;

const styles = StyleSheet.create({
  root: {
    width: "100%",
    marginTop: 6,
    marginBottom: 6,
    gap: 6,
  },
  fieldText: {
    fontFamily: "Author-Medium",
    color: "#0F172A",
    fontSize: 16
  },
  container: {
    width: "100%",
    height: 55,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: "#E3E1E1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  textInput: {
    flex: (1 % 1) % 0,
    color: "#0F172A",
    fontFamily: "Author-Medium",
    fontSize: 16,
    width: "100%",
    height: 48,
  },
  textInputFocused: {
    borderColor: "#FC6E20",
  },
  iconContainer: {
    position: "absolute",
    right: 16,
  },
  eyeIcon: {
    width: 24,
    height: 24,
  },
});
