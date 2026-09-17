import { useRef, useState } from 'react';
import { useToast } from '../../hooks/useToast';

interface AvatarUploadProps {
  avatarUrl: string | null;
  fullName: string | null;
  onUpload: (file: File) => Promise<void>;
}

const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 Mo, aligné sur la limite backend

export default function AvatarUpload({ avatarUrl, fullName, onUpload }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { showToast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_AVATAR_SIZE) {
      showToast('error', "L'image ne doit pas dépasser 5 Mo.");
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    try {
      await onUpload(file);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const initials = fullName
    ? fullName
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  return (
    <div className="relative w-24 h-24 mx-auto">
      <div className="w-24 h-24 rounded-full overflow-hidden bg-white/10 border-2 border-olive/40 flex items-center justify-center">
        {avatarUrl ? (
          <img src={avatarUrl} alt="Photo de profil" className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl text-olive font-semibold">{initials}</span>
        )}
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="absolute bottom-0 right-0 bg-terracotta text-olive w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 border-white/20 disabled:opacity-50"
        aria-label="Changer la photo de profil"
      >
        {isUploading ? '...' : '📷'}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}