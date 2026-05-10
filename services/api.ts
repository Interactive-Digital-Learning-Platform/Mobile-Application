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
      console.log('Uploading note:', { userId, title, fileUri, platform: Platform.OS });
      
      const formData = new FormData();
      
      if (Platform.OS === 'web') {
        // For Web, we must fetch the blob
        const response = await fetch(fileUri);
        const blob = await response.blob();
        formData.append('image', blob, 'note-image.jpg');
      } else {
        // For Native (Expo Go / Android / iOS), we can append the file object directly to FormData
        // React Native's FormData expects this specific object format
        formData.append('image', {
          uri: fileUri,
          name: 'note-image.jpg',
          type: 'image/jpeg',
        } as any);
      }
      
      formData.append('userId', userId);
      formData.append('title', title);

      console.log('Sending request to:', `${API_URL}/api/notes/upload-and-process`);
      
      const apiResponse = await api.post('/notes/upload-and-process', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        // Important for some Axios versions on Native to not try and transform the data
        transformRequest: (data) => data,
      });

      return apiResponse.data;
    } catch (error: any) {
      console.error('Upload error details:', error);
      // If the error is a network error, it's likely the Local IP issue
      if (error.message === 'Network Error' && Platform.OS !== 'web') {
        throw new Error("Network Error: Make sure EXPO_PUBLIC_BACKEND_URL in .env uses your computer's local IP (e.g. 192.168.x.x) instead of localhost.");
      }
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
