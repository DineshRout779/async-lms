import apiClient from './api';

export const getTree = (userId: number, projectId: number) =>
  apiClient.get('/workspace/tree', { params: { userId, projectId } });

export const readFile = (userId: any, projectId: any, filePath: any) =>
  apiClient.get('/workspace/file', { params: { userId, projectId, filePath } });

export const saveFile = (payload: any) =>
  apiClient.post('/workspace/file', payload);

export const createPath = (payload: any) =>
  apiClient.post('/workspace/create', payload);

export const deletePath = (payload: any) =>
  apiClient.post('/workspace/delete', payload);

export const renamePath = (payload: any) =>
  apiClient.post('/workspace/rename', payload);
