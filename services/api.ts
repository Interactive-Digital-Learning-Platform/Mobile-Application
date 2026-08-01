import axios from 'axios';

// In development, this usually needs to be your machine's local IP (e.g., 192.168.1.x)
// since "localhost" refers to the Android emulator or physical device itself.
// You can set this in .env: EXPO_PUBLIC_BACKEND_URL=http://192.168.1.100:3001
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://10.0.2.2:3001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000, // 30s — needed for OCR + AI pipeline responses
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

  // Upload a single or multi-page note
  uploadNote: async (userId: string, title: string, fileUris: string | string[]) => {
    try {
      const uris = Array.isArray(fileUris) ? fileUris : [fileUris];
      console.log('Uploading note pages:', { userId, title, pageCount: uris.length, platform: Platform.OS });
      
      const formData = new FormData();
      
      for (let i = 0; i < uris.length; i++) {
        const uri = uris[i];
        if (Platform.OS === 'web') {
          const response = await fetch(uri);
          const blob = await response.blob();
          formData.append('images', blob, `note-page-${i + 1}.jpg`);
        } else {
          formData.append('images', {
            uri,
            name: `note-page-${i + 1}.jpg`,
            type: 'image/jpeg',
          } as any);
        }
      }
      
      formData.append('userId', userId);
      formData.append('title', title);

      console.log('Sending request to:', `${API_URL}/api/notes/upload-and-process`);
      
      const apiResponse = await api.post('/notes/upload-and-process', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        transformRequest: (data) => data,
      });

      return apiResponse.data;
    } catch (error: any) {
      console.error('Upload error details:', error);
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
