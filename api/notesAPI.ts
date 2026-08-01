import { notesClient } from "@/api/apiClients";
import { Platform } from "react-native";

export const notesApi = {
  // Get all notes for a user
  getNotes: async (userId: string) => {
    const response = await notesClient.get(`/notes?userId=${userId}`);
    return response.data;
  },

  // Get a single note by ID
  getNote: async (noteId: string) => {
    const response = await notesClient.get(`/notes/${noteId}`);
    return response.data;
  },

  // Delete a note
  deleteNote: async (noteId: string) => {
    const response = await notesClient.delete(`/notes/${noteId}`);
    return response.data;
  },

  // Upload a note
  uploadNote: async (userId: string, title: string, fileUri: string) => {
    try {
      console.log("Uploading note:", {
        userId,
        title,
        fileUri,
        platform: Platform.OS,
      });

      const formData = new FormData();

      if (Platform.OS === "web") {
        // For Web, we must fetch the blob
        const response = await fetch(fileUri);
        const blob = await response.blob();
        formData.append("image", blob, "note-image.jpg");
      } else {
        // React Native's FormData expects this file object shape.
        formData.append("image", {
          uri: fileUri,
          name: "note-image.jpg",
          type: "image/jpeg",
        } as any);
      }

      formData.append("userId", userId);
      formData.append("title", title);

      const apiResponse = await notesClient.post(
        "/notes/upload-and-process",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          transformRequest: (data) => data,
        },
      );

      return apiResponse.data;
    } catch (error: any) {
      console.error("Upload error details:", error);
      if (error.message === "Network Error" && Platform.OS !== "web") {
        throw new Error(
          "Network Error: make sure EXPO_PUBLIC_API_GATEWAY_URL uses your computer's local IP instead of localhost.",
        );
      }
      throw error;
    }
  },
};

export const materialsApi = {
  // Get all materials for a note (summary)
  getMaterials: async (noteId: string) => {
    const response = await notesClient.get(`/materials/${noteId}`);
    return response.data;
  },

  // Get specific material type
  getMaterialByType: async (noteId: string, type: string) => {
    const response = await notesClient.get(`/materials/${noteId}/${type}`);
    return response.data;
  },

  // Trigger material generation (all or specific types)
  generateMaterials: async (noteId: string, types?: string[]) => {
    const response = await notesClient.post(`/materials/${noteId}/generate`, {
      types,
    });
    return response.data;
  },
};

export default notesClient;
