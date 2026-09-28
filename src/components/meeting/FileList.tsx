import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  FileArchive,
  Image,
  FileCode,
  File,
  Download,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { User } from '../../context/AuthContext';

export interface SharedFile {
  id: string;
  roomId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploaderId: string;
  uploaderName: string;
  createdAt: number;
  downloadUrl: string;
}

interface FileListProps {
  roomId: string;
  user: User;
  files: SharedFile[];
  onFileUploaded: (file: SharedFile) => void;
}

function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getFileIcon(mime: string, name: string) {
  if (mime.startsWith('image/')) return <Image className="w-5 h-5 text-emerald-400" />;
  if (mime.includes('pdf')) return <FileText className="w-5 h-5 text-rose-400" />;
  if (mime.includes('zip') || mime.includes('compressed') || mime.includes('tar')) {
    return <FileArchive className="w-5 h-5 text-amber-400" />;
  }
  if (name.endsWith('.js') || name.endsWith('.ts') || name.endsWith('.json') || name.endsWith('.py')) {
    return <FileCode className="w-5 h-5 text-sky-400" />;
  }
  return <File className="w-5 h-5 text-slate-400" />;
}

export const FileList: React.FC<FileListProps> = ({
  roomId,
  user,
  files,
  onFileUploaded
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = async (file: globalThis.File) => {
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('roomId', roomId);
      formData.append('uploaderId', user.id);
      formData.append('uploaderName', user.name);

      const res = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      onFileUploaded(data.file);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload file');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 overflow-hidden">
      {/* Upload Dropzone */}
      <div className="p-4 border-b border-slate-800">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-700 hover:border-indigo-500 hover:bg-slate-800/50 transition-all rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer text-center group"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
            className="hidden"
          />
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
              <span className="text-xs text-slate-400">Uploading file to room...</span>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-slate-800 group-hover:bg-indigo-950/80 flex items-center justify-center mb-2 transition-colors">
                <UploadCloud className="w-5 h-5 text-indigo-400" />
              </div>
              <p className="text-sm font-medium text-slate-200">
                Click to share a file
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                or drag and drop here (up to 50MB)
              </p>
            </>
          )}
        </div>

        {uploadSuccess && (
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 p-2 rounded-lg">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>File shared with meeting participants!</span>
          </div>
        )}

        {uploadError && (
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-rose-400 bg-rose-950/40 border border-rose-800/60 p-2 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
          <span>Shared Files ({files.length})</span>
        </div>

        {files.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
            <p>No files shared yet in this meeting.</p>
            <p className="text-xs text-slate-500 mt-1">Upload slides, notes, or code to share with everyone.</p>
          </div>
        ) : (
          files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                  {getFileIcon(file.mimeType, file.fileName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-200 truncate" title={file.fileName}>
                    {file.fileName}
                  </p>
                  <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    <span className="font-mono tabular-nums">{formatBytes(file.fileSize)}</span>
                    <span>·</span>
                    <span className="truncate">{file.uploaderName}</span>
                  </p>
                </div>
              </div>

              <a
                href={file.downloadUrl}
                download={file.fileName}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/80 rounded-lg transition-colors shrink-0"
                title="Download file"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
