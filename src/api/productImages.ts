import customAxios from './axiosInstance';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errorCode?: string;
}

interface PresignRequest {
  files: Array<{
    fileName: string;
    contentType: string;
    sizeBytes: number;
  }>;
}

interface PresignResponse {
  uploads: Array<{
    key: string;
    uploadUrl: string;
    publicUrl: string;
    expiresAt: string;
    headers: Record<string, string>;
  }>;
}

const unwrap = <T>(response: { data: ApiResponse<T> }) => response.data.data;

const LOCAL_IMAGE_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const MAX_LOCAL_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_LOCAL_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const shouldUseLocalDataUrlUpload = () => (
  typeof window !== 'undefined' && LOCAL_IMAGE_HOSTS.has(window.location.hostname)
);

const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  if (!ALLOWED_LOCAL_IMAGE_TYPES.has(file.type)) {
    reject(new Error('jpg, png, webp 이미지만 업로드할 수 있습니다.'));
    return;
  }
  if (file.size <= 0 || file.size > MAX_LOCAL_IMAGE_SIZE_BYTES) {
    reject(new Error('이미지 파일은 10MB 이하만 업로드할 수 있습니다.'));
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === 'string') {
      resolve(reader.result);
      return;
    }
    reject(new Error('이미지 파일을 읽지 못했습니다.'));
  };
  reader.onerror = () => reject(new Error('이미지 파일을 읽지 못했습니다.'));
  reader.readAsDataURL(file);
});

export const uploadProductImages = async (files: File[]): Promise<string[]> => {
  if (files.length === 0) return [];

  if (shouldUseLocalDataUrlUpload()) {
    return Promise.all(files.map(readFileAsDataUrl));
  }

  const request: PresignRequest = {
    files: files.map(file => ({
      fileName: file.name,
      contentType: file.type,
      sizeBytes: file.size,
    })),
  };

  const presignResponse = await customAxios.post<ApiResponse<PresignResponse>>(
    '/products/images/presign',
    request,
  );
  const { uploads } = unwrap(presignResponse);

  if (uploads.length !== files.length) {
    throw new Error('이미지 업로드 URL 개수가 올바르지 않습니다.');
  }

  await Promise.all(
    uploads.map((upload, index) =>
      fetch(upload.uploadUrl, {
        method: 'PUT',
        headers: upload.headers,
        body: files[index],
      }).then(response => {
        if (!response.ok) {
          throw new Error('이미지 업로드에 실패했습니다.');
        }
      }),
    ),
  );

  return uploads.map(upload => upload.publicUrl);
};
