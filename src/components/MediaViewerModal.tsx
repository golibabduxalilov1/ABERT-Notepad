import React from 'react';
import { X } from 'lucide-react';
import { MediaAttachment } from '../types';

interface MediaViewerModalProps {
  attachment: MediaAttachment | null;
  onClose: () => void;
}

export const MediaViewerModal: React.FC<MediaViewerModalProps> = ({ attachment, onClose }) => {
  if (!attachment) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative max-w-4xl max-h-[92vh] w-full bg-slate-900 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-slate-900 border-b border-slate-800 text-slate-200">
          <div className="min-w-0 flex-1 pr-2">
            <h3
              className="font-semibold text-sm sm:text-base truncate text-slate-100"
              title={attachment.fileName}
            >
              {attachment.fileName}
            </h3>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              Добавлено: {new Date(attachment.createdAt).toLocaleString('ru-RU')}
            </p>
          </div>
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="p-2 sm:p-2.5 min-w-[44px] min-h-[44px] text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-xl transition flex items-center justify-center shadow-sm"
              title="Закрыть"
              aria-label="Закрыть"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content viewer */}
        <div className="flex-1 flex items-center justify-center bg-slate-950/80 p-3 sm:p-4 overflow-auto">
          {attachment.type === 'photo' && (
            <img
              src={attachment.url}
              alt={attachment.fileName}
              className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-md"
            />
          )}

          {attachment.type === 'video' && (
            <video
              src={attachment.url}
              controls
              autoPlay
              className="max-h-[75vh] max-w-full rounded-lg shadow-md"
            />
          )}

          {attachment.type === 'voice' && (
            <div className="bg-slate-900 border border-slate-700 p-4 sm:p-6 rounded-2xl max-w-md w-full space-y-4 text-center mx-auto">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto">
                <span className="text-2xl">🎙️</span>
              </div>
              <h4 className="text-slate-100 font-semibold text-xs sm:text-sm break-all px-1">
                {attachment.fileName}
              </h4>
              {attachment.transcript && (
                <p className="text-xs text-slate-300 italic bg-slate-950 p-3 rounded-lg border border-slate-800">
                  "{attachment.transcript}"
                </p>
              )}
              {attachment.url && (
                <audio src={attachment.url} controls className="w-full mt-2" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
