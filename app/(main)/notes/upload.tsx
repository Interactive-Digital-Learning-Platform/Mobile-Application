import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  X,
  Camera,
  Image as ImageIcon,
  Plus,
  Trash2,
  Layers,
  Sparkles,
  Check,
  ShieldCheck,
} from "lucide-react-native";
import { useAuth } from "@clerk/expo";
import { notesApi, RESEARCH_CONSENT_VERSION } from "@/api/notesAPI";
import { colors } from "@/constants/colors";
import InputField from "@/components/InputField";
import Toast from "react-native-toast-message";
import { notesErrorMessage } from "@/utils/noteErrors";

export default function UploadNote() {
  const router = useRouter();
  const { userId } = useAuth();

  const [images, setImages] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState<10 | 11 | undefined>();
  const [topic, setTopic] = useState("");
  const [researchConsent, setResearchConsent] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const choosingPhoto = React.useRef(false);

  const pickImages = async () => {
    if(isUploading||images.length>=20||choosingPhoto.current)return;
    choosingPhoto.current = true;
    try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Toast.show({
        type: "error",
        text1: "Permission needed",
        text2: "Gallery access is required to select handwritten note photos.",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: Math.max(1,20-images.length),
      quality: 0.85,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const newUris = result.assets.map((asset) => asset.uri);
      setImages((prev) => [...prev, ...newUris].slice(0,20));
    }
    } catch {
      Toast.show({ type: "error", text1: "Couldn't open your photos", text2: "Please try again, or use the camera instead." });
    } finally { choosingPhoto.current = false; }
  };

  const takePhoto = async () => {
    if(isUploading||images.length>=20||choosingPhoto.current)return;
    choosingPhoto.current = true;
    try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Toast.show({
        type: "error",
        text1: "Permission needed",
        text2: "Camera access is required to photograph your handwritten notes.",
      });
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImages((prev) => [...prev, result.assets[0].uri].slice(0,20));
    }
    } catch {
      Toast.show({ type: "error", text1: "Couldn't open the camera", text2: "Please try again, or choose photos from your gallery." });
    } finally { choosingPhoto.current = false; }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (isUploading) return;
    if (images.length === 0) {
      Toast.show({
        type: "error",
        text1: "No Images Added",
        text2: "Please take a photo or select note pages from your gallery.",
      });
      return;
    }
    if (!title.trim()) {
      Toast.show({
        type: "error",
        text1: "Missing Note Title",
        text2: "Please provide a descriptive title for your note.",
      });
      return;
    }
    if (!userId) { setUploadError("Please sign in again to upload your notes."); return; }

    setIsUploading(true);
    setUploadError("");
    try {
      const response = await notesApi.uploadNote(userId, title.trim(), images, {
        context: {
          subject,
          grade,
          topic,
        },
        researchConsent,
        researchConsentVersion: RESEARCH_CONSENT_VERSION,
      });
      if (response.success) {
        Toast.show({
          type: "success",
          text1: "Upload Complete",
          text2: `Uploaded ${images.length} page(s). Analysis continues in the background; check Notes for the result.`,
        });
        router.replace("/(tabs)/notes");
      } else {
        setUploadError("We couldn't upload your note. Please try again in a moment.");
      }
    } catch (error: unknown) {
      const message = notesErrorMessage(error);
      setUploadError(message);
      Toast.show({
        type: "error",
        text1: "Upload Failed",
        text2: message,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />

      {/* ── Top Header ── */}
      <View style={styles.header}>
        <View style={styles.headerTextGroup}>
          <Text style={styles.headerTitle}>Upload Note</Text>
          <Text style={styles.headerSubtitle}>AI-Powered Handwritten Note Analysis</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeButton}
          disabled={isUploading}
          activeOpacity={0.7}
        >
          <X size={20} color="#475569" strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!!uploadError && <View style={{ padding: 16, backgroundColor: "#FFF7ED", borderRadius: 12, marginBottom: 16 }}>
          <Text accessibilityRole="alert" style={{ color: "#9A3412", lineHeight: 21 }}>{uploadError}</Text>
          <Text style={{ color: "#475569", marginTop: 8, lineHeight: 20 }}>Your selected photos are still here. If an upload was interrupted, check Notes before uploading the same pages again.</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => router.replace("/(tabs)/notes")} style={{ paddingVertical: 12 }}><Text style={{ color: colors.primary, fontWeight: "700" }}>Check my notes</Text></TouchableOpacity>
        </View>}
        {/* ── Section 1: Note Details ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderLabel}>NOTE DETAILS</Text>
        </View>

        <View style={styles.inputCard}>
          <InputField
            title="Note Title"
            placeHolder="e.g. Science - 2nd lesson"
            value={title}
            handleChange={setTitle}
            keyboardType="default"
          />

          <Text style={styles.contextTitle}>Optional learning context</Text>
          <Text style={styles.contextHelper}>
            This helps match your note to the right syllabus lesson. Leave blank if you are unsure.
          </Text>
          <InputField
            title="Subject"
            placeHolder="e.g. Science or Mathematics"
            value={subject}
            handleChange={setSubject}
            keyboardType="default"
          />
          <View style={styles.gradeBlock}>
            <Text style={styles.gradeLabel}>Grade</Text>
            <View style={styles.gradeOptions}>
              {([10, 11] as const).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.gradeOption, grade === option && styles.gradeOptionActive]}
                  onPress={() => setGrade(grade === option ? undefined : option)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.gradeOptionText, grade === option && styles.gradeOptionTextActive]}>
                    Grade {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <InputField
            title="Topic or lesson name"
            placeHolder="e.g. Photosynthesis"
            value={topic}
            handleChange={setTopic}
            keyboardType="default"
          />
        </View>

        {/* ── Section 2: Note Pages ── */}
        <View style={styles.sectionHeaderBetween}>
          <Text style={styles.sectionHeaderLabel}>
            NOTE PAGES ({images.length}/20)
          </Text>
          {images.length > 0 && (
            <Text style={styles.sectionHelperText}>
              {images.length === 1 ? "1 page added" : `${images.length} pages added`}
            </Text>
          )}
        </View>

        {images.length === 0 ? (
          /* Empty / Initial Upload Box */
          <View style={styles.emptyUploadBox}>
            <View style={styles.iconCircle}>
              <Layers size={36} color={colors.primary} strokeWidth={1.8} />
            </View>
            <Text style={styles.emptyTitle}>Capture or Choose Note Pages</Text>
            <Text style={styles.emptySubtitle}>
              Upload multi-page handwritten notes (up to 20 pages) for syllabus gap detection and study material generation.
            </Text>

            <View style={styles.pickerRow}>
              <TouchableOpacity
                style={styles.pickerBtnPrimary}
                onPress={takePhoto}
                activeOpacity={0.85}
              >
                <Camera size={19} color="#fff" strokeWidth={2} />
                <Text style={styles.pickerBtnPrimaryText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.pickerBtnSecondary}
                onPress={pickImages}
                activeOpacity={0.85}
              >
                <ImageIcon size={19} color="#1E293B" strokeWidth={2} />
                <Text style={styles.pickerBtnSecondaryText}>Choose Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Page Thumbnails Reel */
          <View style={styles.pagesContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pagesReel}
            >
              {images.map((uri, index) => (
                <View key={`${uri}-${index}`} style={styles.pageThumbCard}>
                  <Image source={{ uri }} style={styles.thumbImage} resizeMode="cover" />
                  
                  {/* Frosted Page Badge */}
                  <View style={styles.thumbBadge}>
                    <Text style={styles.thumbBadgeText}>Page {index + 1}</Text>
                  </View>

                  {/* Delete Badge */}
                  <TouchableOpacity
                    style={styles.deleteThumbBtn}
                    onPress={() => removeImage(index)}
                    disabled={isUploading}
                    activeOpacity={0.8}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Trash2 size={13} color="#fff" strokeWidth={2.4} />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Add More Slot */}
              {images.length < 20 && (
                <View style={styles.addMoreCard}>
                  <TouchableOpacity
                    style={styles.addMoreAction}
                    onPress={takePhoto}
                    disabled={isUploading}
                    activeOpacity={0.8}
                  >
                    <Camera size={20} color={colors.primary} strokeWidth={2} />
                    <Text style={styles.addMoreActionText}>Camera</Text>
                  </TouchableOpacity>

                  <View style={styles.addMoreDivider} />

                  <TouchableOpacity
                    style={styles.addMoreAction}
                    onPress={pickImages}
                    disabled={isUploading}
                    activeOpacity={0.8}
                  >
                    <Plus size={20} color="#475569" strokeWidth={2} />
                    <Text style={[styles.addMoreActionText, { color: "#475569" }]}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            {/* Quick Action Bottom Bar */}
            <View style={styles.quickAddBar}>
              <TouchableOpacity
                style={styles.quickAddBtn}
                onPress={takePhoto}
                disabled={isUploading}
                activeOpacity={0.85}
              >
                <Camera size={16} color="#fff" strokeWidth={2} />
                <Text style={styles.quickAddBtnText}>Add Page via Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickAddBtnOutline}
                onPress={pickImages}
                disabled={isUploading}
                activeOpacity={0.85}
              >
                <ImageIcon size={16} color="#1E293B" strokeWidth={2} />
                <Text style={styles.quickAddBtnOutlineText}>Add via Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Tip Box */}
        <View style={styles.tipBox}>
          <Sparkles size={16} color={colors.primary} strokeWidth={2} style={{ marginTop: 2 }} />
          <Text style={styles.tipText}>
            <Text style={{ fontWeight: "700", color: "#1E293B" }}>AI Tip: </Text>
            Ensure good lighting and capture all pages in reading order for highest OCR accuracy.
          </Text>
        </View>

        <View style={styles.consentCard}>
          <View style={styles.consentHeader}>
            <View style={styles.consentIconWrap}>
              <ShieldCheck size={18} color="#0369A1" strokeWidth={2.2} />
            </View>
            <View style={styles.consentHeadingCopy}>
              <Text style={styles.consentTitle}>Optional research contribution</Text>
              <Text style={styles.consentOptional}>Your choice will not affect note analysis.</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.consentChoice}
            onPress={() => setResearchConsent((current) => !current)}
            disabled={isUploading}
            activeOpacity={0.75}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: researchConsent, disabled: isUploading }}
            accessibilityLabel="Allow this note to be used for research and model improvement"
          >
            <View style={[styles.checkbox, researchConsent && styles.checkboxChecked]}>
              {researchConsent && <Check size={15} color="#FFFFFF" strokeWidth={3} />}
            </View>
            <Text style={styles.consentText}>
              I allow a pseudonymized copy of these note images and their OCR text to be
              reviewed by approved subject experts and used to improve the concept
              classifier.
            </Text>
          </TouchableOpacity>

          <Text style={styles.consentPrivacyText}>
            Please avoid names or other personal details in your notes. You may withdraw
            this permission later from the completed note. Consent version {RESEARCH_CONSENT_VERSION}.
          </Text>
        </View>
      </ScrollView>

      {/* ── Bottom Sticky Action Footer ── */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.uploadButton,
            (images.length === 0 || !title.trim() || isUploading) &&
              styles.uploadButtonDisabled,
          ]}
          onPress={handleUpload}
          disabled={images.length === 0 || !title.trim() || isUploading}
          activeOpacity={0.85}
        >
          {isUploading ? (
            <>
              <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />
              <Text style={styles.uploadButtonText}>
                Uploading & Analyzing {images.length} Page(s)…
              </Text>
            </>
          ) : (
            <>
              <Sparkles size={20} color="#fff" strokeWidth={2.2} style={{ marginRight: 8 }} />
              <Text style={styles.uploadButtonText}>
                Upload & Analyze Notes {images.length > 0 ? `(${images.length} Pages)` : ""}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "400",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 18,
    paddingBottom: 40,
  },
  sectionHeader: {
    marginBottom: 8,
  },
  sectionHeaderBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 8,
  },
  sectionHeaderLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.6,
  },
  sectionHelperText: {
    fontSize: 11.5,
    color: "#94A3B8",
    fontWeight: "500",
  },
  inputCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  contextTitle: {
    marginTop: 18,
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  contextHelper: {
    marginTop: 4,
    marginBottom: 14,
    fontSize: 12,
    lineHeight: 17,
    color: "#64748B",
  },
  gradeBlock: {
    marginBottom: 14,
  },
  gradeLabel: {
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  gradeOptions: {
    flexDirection: "row",
    gap: 10,
  },
  gradeOption: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  gradeOptionActive: {
    borderColor: colors.primary,
    backgroundColor: "#FFF7ED",
  },
  gradeOptionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  gradeOptionTextActive: {
    color: colors.primary,
  },
  emptyUploadBox: {
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFEDD5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  pickerRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  pickerBtnPrimary: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  pickerBtnPrimaryText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  pickerBtnSecondary: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 13,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  pickerBtnSecondaryText: {
    color: "#1E293B",
    fontWeight: "700",
    fontSize: 14,
  },
  pagesContainer: {
    marginTop: 4,
  },
  pagesReel: {
    paddingVertical: 6,
    gap: 12,
  },
  pageThumbCard: {
    width: 140,
    height: 190,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
    position: "relative",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  thumbBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  thumbBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  deleteThumbBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#EF4444",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  addMoreCard: {
    width: 130,
    height: 190,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
    gap: 8,
  },
  addMoreAction: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    width: "100%",
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
  },
  addMoreActionText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: colors.primary,
    marginTop: 4,
  },
  addMoreDivider: {
    width: "60%",
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  quickAddBar: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  quickAddBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#0F172A",
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  quickAddBtnText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 12.5,
  },
  quickAddBtnOutline: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  quickAddBtnOutlineText: {
    color: "#0F172A",
    fontWeight: "600",
    fontSize: 12.5,
  },
  tipBox: {
    flexDirection: "row",
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFEDD5",
    borderRadius: 14,
    padding: 14,
    marginTop: 20,
    gap: 10,
    alignItems: "flex-start",
  },
  tipText: {
    fontSize: 12.5,
    color: "#9A3412",
    lineHeight: 18,
    flex: 1,
  },
  consentCard: {
    marginTop: 14,
    padding: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    backgroundColor: "#F0F9FF",
  },
  consentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  consentIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E0F2FE",
  },
  consentHeadingCopy: {
    flex: 1,
  },
  consentTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0C4A6E",
  },
  consentOptional: {
    marginTop: 2,
    fontSize: 11.5,
    color: "#0369A1",
  },
  consentChoice: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#7DD3FC",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    borderColor: "#0284C7",
    backgroundColor: "#0284C7",
  },
  consentText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: "#334155",
  },
  consentPrivacyText: {
    marginTop: 11,
    marginLeft: 32,
    fontSize: 11,
    lineHeight: 16,
    color: "#64748B",
  },
  footer: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  uploadButton: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    height: 54,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  uploadButtonDisabled: {
    backgroundColor: "#FED7AA",
    shadowOpacity: 0,
    elevation: 0,
  },
  uploadButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
});
