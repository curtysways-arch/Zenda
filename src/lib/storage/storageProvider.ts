export interface StorageProvider {
  /**
   * Uploads a file buffer to the configured storage.
   * @param fileBuffer   Buffer containing the file data.
   * @param folderPath   Relative folder path inside the storage (e.g. 'business/123/logo').
   * @param filename     Desired filename (including extension).
   * @param mimeType     MIME type of the file.
   * @returns Public URL that can be used to access the file.
   */
  uploadFile(fileBuffer: Buffer, folderPath: string, filename: string, mimeType: string): Promise<string>;

  /**
   * Deletes a previously uploaded file given its public URL.
   * @param fileUrl Public URL returned by `uploadFile`.
   */
  deleteFile(fileUrl: string): Promise<void>;
}
