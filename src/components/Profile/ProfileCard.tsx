import AvatarUpload from './AvatarUpload';
import EditableField from './EditableField';
import type { Profile } from '../../types/profile';

export type EditingField = 'full_name' | 'username' | 'email' | 'password' | null;

interface ProfileCardProps {
  profile: Profile;
  onLogout: () => void;
  onUploadAvatar: (file: File) => Promise<void>;
  editingField: EditingField;
  setEditingField: (field: EditingField) => void;
}

export default function ProfileCard({
  profile,
  onLogout,
  onUploadAvatar,
  setEditingField,
}: ProfileCardProps) {
  return (
    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 w-full max-w-[380px] flex-shrink-0 relative shadow-lg">
      <button
        type="button"
        onClick={onLogout}
        className="absolute top-4 right-4 text-xs text-white/60 hover:text-white transition"
      >
        Déconnexion
      </button>

      <AvatarUpload
        avatarUrl={profile.avatar_url}
        fullName={profile.full_name}
        onUpload={onUploadAvatar}
      />

      <div className="text-center mt-3">
        <p className="text-white font-semibold">{profile.full_name || profile.username}</p>
        {profile.role === 'admin' && (
          <span className="inline-block mt-1 text-xs bg-terracotta text-olive font-semibold px-2 py-0.5 rounded-full">
            Admin
          </span>
        )}
      </div>

      <div className="mt-6">
        <EditableField
          label="Nom complet"
          value={profile.full_name || '—'}
          onEditClick={() => setEditingField('full_name')}
        />
        <EditableField
          label="Nom d'utilisateur"
          value={profile.username}
          onEditClick={() => setEditingField('username')}
        />
        <EditableField
          label="Adresse e-mail"
          value={profile.email}
          onEditClick={() => setEditingField('email')}
        />
        <EditableField
          label="Mot de passe"
          value="••••••••"
          onEditClick={() => setEditingField('password')}
        />
      </div>
    </div>
  );
}