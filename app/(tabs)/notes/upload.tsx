import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { X, Upload, Camera, Image as ImageIcon } from "lucide-react-native";
import { useAuth } from "@/hooks/useAuth";
import { notesApi } from "@/services/api";
import { colors } from "@/constants/colors";
import InputField from "@/components/InputField";
import Toast from "react-native-toast-message";

export default function UploadNote() {
  const router = useRouter();
  const { userId } = useAuth();
  
  const [image, setImage] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({ type: "error", text1: "Permission needed", text2: "Gallery access is required." });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({ type: "error", text1: "Permission needed", text2: "Camera access is required." });
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleUpload = async () => {
    if (!image) {
      Toast.show({ type: "error", text1: "No Image", text2: "Please select or take a photo of your notes." });
      return;
    }
    if (!title.trim()) {
      Toast.show({ type: "error", text1: "Missing Title", text2: "Please give your notes a title." });
      return;
    }
    if (!userId) return;

    setIsUploading(true);
    try {
      const response = await notesApi.uploadNote(userId, title, image);
      if (response.success) {
        Toast.show({ type: "success", text1: "Success", text2: "Note uploaded and sent for processing!" });
        // Go to detail page to watch it process
        router.replace(`/(tabs)/notes/${response.data.noteId}`);
      } else {
        throw new Error(response.error || "Upload failed");
      }
    } catch (error: any) {
      console.error(error);
      Toast.show({ 
        type: "error", 
        text1: "Upload Failed", 
        text2: error.message || "Could not upload note. Please try again." 
      });
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Upload Note</Text>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.closeButton}
          disabled={isUploading}
        >
          <X size={24} color={colors.primaryBlack} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Note Details</Text>
        <InputField
          title="Title"
          placeHolder="e.g. Biology - Photosynthesis"
          value={title}
          handleChange={setTitle}
        />

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Note Image</Text>
        
        {!image ? (
          <View style={styles.imagePlaceholder}>
            <View style={styles.placeholderIconContainer}>
              <ImageIcon size={48} color="#d1d5db" />
            </View>
            <Text style={styles.placeholderTitle}>No image selected</Text>
            <Text style={styles.placeholderSub}>Take a clear photo of your handwritten notes</Text>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionBtn} onPress={takePhoto}>
                <Camera size={20} color="#fff" />
                <Text style={styles.actionBtnText}>Camera</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOutline]} onPress={pickImage}>
                <ImageIcon size={20} color={colors.primaryBlack} />
                <Text style={styles.actionBtnOutlineText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: image }} style={styles.imagePreview} />
            <TouchableOpacity 
              style={styles.retakeButton}
              onPress={() => setImage(null)}
              disabled={isUploading}
            >
              <Text style={styles.retakeButtonText}>Remove Image</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[
            styles.uploadButton, 
            (!image || !title.trim() || isUploading) && styles.uploadButtonDisabled
          ]}
          onPress={handleUpload}
          disabled={!image || !title.trim() || isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />
          ) : (
            <Upload size={20} color="#fff" style={{ marginRight: 10 }} />
          )}<Text style={styles.uploadButtonText}>
            {isUploading ? "Uploading & Processing..." : "Upload Note"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Author-Bold",
    color: colors.primaryBlack,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Author-SemiBold",
    color: colors.primaryBlack,
    marginBottom: 12,
  },
  imagePlaceholder: {
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
  },
  placeholderIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  placeholderTitle: {
    fontSize: 18,
    fontFamily: "Author-Medium",
    color: colors.primaryBlack,
    marginBottom: 4,
  },
  placeholderSub: {
    fontSize: 14,
    color: "#6b7280",
    fontFamily: "Author-Regular",
    textAlign: "center",
    marginBottom: 24,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: colors.primaryBlack,
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  actionBtnText: {
    color: "#fff",
    fontFamily: "Author-Medium",
    fontSize: 16,
  },
  actionBtnOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.borderColorLight,
  },
  actionBtnOutlineText: {
    color: colors.primaryBlack,
    fontFamily: "Author-Medium",
    fontSize: 16,
  },
  imagePreviewContainer: {
    width: "100%",
    aspectRatio: 3/4,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  retakeButton: {
    position: "absolute",
    bottom: 16,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retakeButtonText: {
    color: "#fff",
    fontFamily: "Author-Medium",
    fontSize: 14,
  },
  footer: {
    padding: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  uploadButton: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadButtonDisabled: {
    backgroundColor: "#fed7aa", // lighter orange
  },
  uploadButtonText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Author-SemiBold",
  },
});
