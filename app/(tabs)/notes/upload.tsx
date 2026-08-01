import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { X, Upload, Camera, Image as ImageIcon, Plus, Trash2, Layers } from "lucide-react-native";
import { useAuth } from "@clerk/expo";
import { notesApi } from "@/services/api";
import { colors } from "@/constants/colors";
import InputField from "@/components/InputField";
import Toast from "react-native-toast-message";

export default function UploadNote() {
  const router = useRouter();
  const { userId } = useAuth();

  const [images, setImages] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Toast.show({
        type: "error",
        text1: "Permission needed",
        text2: "Gallery access is required.",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 20,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const newUris = result.assets.map((asset) => asset.uri);
      setImages((prev) => [...prev, ...newUris]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Toast.show({
        type: "error",
        text1: "Permission needed",
        text2: "Camera access is required.",
      });
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImages((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (images.length === 0) {
      Toast.show({
        type: "error",
        text1: "No Images",
        text2: "Please select or take photos of your note pages.",
      });
      return;
    }
    if (!title.trim()) {
      Toast.show({
        type: "error",
        text1: "Missing Title",
        text2: "Please give your notes a title.",
      });
      return;
    }
    if (!userId) return;

    setIsUploading(true);
    try {
      const response = await notesApi.uploadNote(userId, title.trim(), images);
      if (response.success) {
        Toast.show({
          type: "success",
          text1: "Success",
          text2: `Uploaded ${images.length} page(s) and started processing!`,
        });
        router.replace(`/(tabs)/notes/${response.data.noteId}`);
      } else {
        throw new Error(response.error || "Upload failed");
      }
    } catch (error: any) {
      console.error(error);
      Toast.show({
        type: "error",
        text1: "Upload Failed",
        text2: error.message || "Could not upload note. Please try again.",
      });
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Upload Multi-Page Note</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeButton}
          disabled={isUploading}
        >
          <X size={24} color={colors.primaryBlack} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>Note Details</Text>
        <InputField
          title="Title"
          placeHolder="e.g. Science - Photosynthesis (Ch. 1)"
          value={title}
          handleChange={setTitle}
          keyboardType="default"
        />

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            Note Pages ({images.length})
          </Text>
          {images.length > 0 && (
            <Text style={styles.pageHelperText}>
              Tap to add more pages
            </Text>
          )}
        </View>

        {images.length === 0 ? (
          <View style={styles.imagePlaceholder}>
            <View style={styles.placeholderIconContainer}>
              <Layers size={44} color={colors.primary} />
            </View>
            <Text style={styles.placeholderTitle}>No pages added yet</Text>
            <Text style={styles.placeholderSub}>
              You can upload multi-page handwritten notes (1 to 20 pages)
            </Text>

            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionBtn} onPress={takePhoto}>
                <Camera size={20} color="#fff" />
                <Text style={styles.actionBtnText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnOutline]}
                onPress={pickImages}
              >
                <ImageIcon size={20} color={colors.primaryBlack} />
                <Text style={styles.actionBtnOutlineText}>Select Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.pagesSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pagesList}
            >
              {images.map((uri, index) => (
                <View key={`${uri}-${index}`} style={styles.pageCard}>
                  <Image source={{ uri }} style={styles.pageThumbnail} />
                  <View style={styles.pageBadge}>
                    <Text style={styles.pageBadgeText}>Page {index + 1}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deletePageBtn}
                    onPress={() => removeImage(index)}
                    disabled={isUploading}
                  >
                    <Trash2 size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}

              {images.length < 20 && (
                <View style={styles.addMoreCard}>
                  <TouchableOpacity
                    style={styles.addMoreBtn}
                    onPress={takePhoto}
                    disabled={isUploading}
                  >
                    <Camera size={22} color={colors.primary} />
                    <Text style={styles.addMoreText}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.addMoreBtn, { marginTop: 8 }]}
                    onPress={pickImages}
                    disabled={isUploading}
                  >
                    <Plus size={22} color={colors.primaryBlack} />
                    <Text style={[styles.addMoreText, { color: colors.primaryBlack }]}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            <View style={styles.addPagesBar}>
              <TouchableOpacity
                style={styles.addBarBtn}
                onPress={takePhoto}
                disabled={isUploading}
              >
                <Camera size={18} color="#fff" />
                <Text style={styles.addBarBtnText}>+ Add Page (Camera)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.addBarBtn, styles.addBarBtnOutline]}
                onPress={pickImages}
                disabled={isUploading}
              >
                <ImageIcon size={18} color={colors.primaryBlack} />
                <Text style={styles.addBarBtnOutlineText}>+ Add Pages (Gallery)</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.uploadButton,
            (images.length === 0 || !title.trim() || isUploading) &&
              styles.uploadButtonDisabled,
          ]}
          onPress={handleUpload}
          disabled={images.length === 0 || !title.trim() || isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />
          ) : (
            <Upload size={20} color="#fff" style={{ marginRight: 10 }} />
          )}
          <Text style={styles.uploadButtonText}>
            {isUploading
              ? `Processing ${images.length} Page(s)...`
              : `Upload & Analyze ${images.length > 0 ? `(${images.length} Pages)` : ""}`}
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
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
  },
  pageHelperText: {
    fontSize: 13,
    color: "#6b7280",
    fontFamily: "Author-Regular",
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
    marginTop: 8,
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
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  actionBtnText: {
    color: "#fff",
    fontFamily: "Author-Medium",
    fontSize: 15,
  },
  actionBtnOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.borderColorLight,
  },
  actionBtnOutlineText: {
    color: colors.primaryBlack,
    fontFamily: "Author-Medium",
    fontSize: 15,
  },
  pagesSection: {
    marginTop: 4,
  },
  pagesList: {
    paddingVertical: 8,
    gap: 12,
  },
  pageCard: {
    width: 140,
    height: 190,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
    position: "relative",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  pageThumbnail: {
    width: "100%",
    height: "100%",
  },
  pageBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pageBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Author-SemiBold",
  },
  deletePageBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(220, 38, 38, 0.85)",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  addMoreCard: {
    width: 140,
    height: 190,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#d1d5db",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    padding: 8,
  },
  addMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#fff",
    elevation: 1,
  },
  addMoreText: {
    fontSize: 13,
    fontFamily: "Author-Medium",
    color: colors.primary,
  },
  addPagesBar: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  addBarBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: colors.primaryBlack,
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  addBarBtnText: {
    color: "#fff",
    fontFamily: "Author-Medium",
    fontSize: 13,
  },
  addBarBtnOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.borderColorLight,
  },
  addBarBtnOutlineText: {
    color: colors.primaryBlack,
    fontFamily: "Author-Medium",
    fontSize: 13,
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
    backgroundColor: "#fed7aa",
  },
  uploadButtonText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Author-SemiBold",
  },
});
