import axios from 'axios';
import * as FileSystem from 'expo-file-system';

// In development, this usually needs to be your machine's local IP (e.g., 192.168.1.x)
// since "localhost" refers to the Android emulator or physical device itself.
// You can set this in .env: EXPO_PUBLIC_BACKEND_URL=http://192.168.1.100:3001
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://10.0.2.2:3001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 10000,
});

import { Platform } from 'react-native';

export const notesApi = {
  // Get all notes for a user
  getNotes: async (userId: string) => {
    const response = await api.get(`/notes?userId=${userId}`);
    return response.data;
  },

  // Get a single note by ID
  getNote: async (noteId: string) => {
    const response = await api.get(`/notes/${noteId}`);
    return response.data;
  },

  // Delete a note
  deleteNote: async (noteId: string) => {
    const response = await api.delete(`/notes/${noteId}`);
    return response.data;
  },

  // Upload a note
  uploadNote: async (userId: string, title: string, fileUri: string) => {
    try {
      if (Platform.OS === 'web') {
        // For Web, we use FormData and axios
        const formData = new FormData();
        
        // Fetch the file blob from the URI (which is a blob URI or base64 on web)
        const response = await fetch(fileUri);
        const blob = await response.blob();
        
        formData.append('image', blob, 'note-image.jpg');
        formData.append('userId', userId);
        formData.append('title', title);

        const apiResponse = await api.post('/notes/upload-and-process', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        return apiResponse.data;
      } else {
        // For Native, we use expo-file-system
        if (!FileSystem.uploadAsync || !FileSystem.FileSystemUploadType) {
          throw new Error("FileSystem upload is not supported on this platform.");
        }

        const response = await FileSystem.uploadAsync(`${API_URL}/api/notes/upload-and-process`, fileUri, {
          fieldName: 'image',
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          parameters: {
            userId,
            title,
          },
        });

        return JSON.parse(response.body);
      }
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  },
};

export const materialsApi = {
  // Get all materials for a note (summary)
  getMaterials: async (noteId: string) => {
    const response = await api.get(`/materials/${noteId}`);
    return response.data;
  },

  // Get specific material type
  getMaterialByType: async (noteId: string, type: string) => {
    const response = await api.get(`/materials/${noteId}/${type}`);
    return response.data;
  },

  // Trigger material generation (all or specific types)
  generateMaterials: async (noteId: string, types?: string[]) => {
    const response = await api.post(`/materials/${noteId}/generate`, { types });
    return response.data;
  },
};

export default api;
