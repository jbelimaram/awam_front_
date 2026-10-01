import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import ProfileCard, { type EditingField } from '../components/Profile/ProfileCard';
import EditFieldPanel from '../components/Profile/EditFieldPanel';
import EditPasswordPanel from '../components/Profile/EditPasswordPanel';
import AgendaCard from '../components/Profile/Agenda/AgendaCard';

import { profileService } from '../Services/profileService';
import { useAuth } from '../hooks/useAuth';
import { useFormStatus } from '../hooks/useFormStatus';
import { useToast } from '../hooks/useToast';
import type { Profile } from '../types/profile';

import {
  fullNameUpdateSchema,
  usernameUpdateSchema,
  emailUpdateSchema,
  type FullNameUpdateValues,
  type UsernameUpdateValues,
  type EmailUpdateValues,
  type PasswordUpdateValues,
} from '../utils/schemas';

import './ProfilePage.css';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [editingField, setEditingField] = useState<EditingField>(null);
  const { run, reset } = useFormStatus();
  const { showToast } = useToast();

  useEffect(() => {
    let cancelled = false;
    profileService
      .getProfile()
      .then((data) => {
        if (cancelled) return;
        setProfile(data);
        setLoadError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        // Ex. session expirée (401) ou back injoignable : on affiche la raison
        setLoadError(err instanceof Error ? err.message : 'Impossible de charger le profil.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const handleRetry = () => {
    setIsLoading(true);
    setLoadError(null);
    setReloadKey((k) => k + 1);
  };

  // logout() de AuthContext appelle déjà authService.logout() (POST /auth/logout)
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleUpdateFullName = (data: FullNameUpdateValues) =>
    run(async () => {
      const updated = await profileService.updateFullName(data);
      setProfile(updated);
      showToast('success', 'Nom complet mis à jour avec succès.');
      setEditingField(null);
    });

  const handleUpdateUsername = (data: UsernameUpdateValues) =>
    run(async () => {
      const updated = await profileService.updateUsername(data);
      setProfile(updated);
      showToast('success', "Nom d'utilisateur mis à jour avec succès.");
      setEditingField(null);
    });

  const handleUpdateEmail = (data: EmailUpdateValues) =>
    run(async () => {
      const updated = await profileService.updateEmail(data);
      setProfile(updated);
      showToast('success', 'Adresse e-mail mise à jour avec succès.');
      setEditingField(null);
    });

  const handleUpdatePassword = (data: PasswordUpdateValues) =>
    run(async () => {
      const updated = await profileService.updatePassword(data);
      setProfile(updated);
      showToast('success', 'Mot de passe mis à jour avec succès.');
      setEditingField(null);
    });

  const handleUploadAvatar = (file: File) =>
    run(async () => {
      const updated = await profileService.uploadAvatar(file);
      setProfile(updated);
      showToast('success', 'Photo de profil mise à jour avec succès.');
    });

  const handleSetEditingField = (field: EditingField) => {
    reset();
    setEditingField(field);
  };

  if (isLoading) {
    return (
      <div className="profile-page flex items-center justify-center">
        Chargement...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-page flex flex-col items-center justify-center gap-4 text-center">
        <p>{loadError ?? 'Impossible de charger le profil.'}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleRetry}
            className="px-4 py-2 rounded-lg border border-current hover:opacity-80"
          >
            Réessayer
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg border border-current hover:opacity-80"
          >
            Se reconnecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page p-8 my-auto">
      <div className="cards-wrapper flex gap-6 items-start justify-center flex-wrap mx-auto">
        <ProfileCard
          profile={profile}
          onLogout={handleLogout}
          onUploadAvatar={handleUploadAvatar}
          editingField={editingField}
          setEditingField={handleSetEditingField}
        />

        {editingField === 'full_name' && (
          <EditFieldPanel
            label="Nom complet"
            fieldName="full_name"
            currentValue={profile.full_name || ''}
            schema={fullNameUpdateSchema}
            onConfirm={handleUpdateFullName}
            onCancel={() => setEditingField(null)}
          />
        )}

        {editingField === 'username' && (
          <EditFieldPanel
            label="Nom d'utilisateur"
            fieldName="username"
            currentValue={profile.username}
            schema={usernameUpdateSchema}
            onConfirm={handleUpdateUsername}
            onCancel={() => setEditingField(null)}
          />
        )}

        {editingField === 'email' && (
          <EditFieldPanel
            label="Adresse e-mail"
            fieldName="email"
            currentValue={profile.email}
            schema={emailUpdateSchema}
            onConfirm={handleUpdateEmail}
            onCancel={() => setEditingField(null)}
          />
        )}

        {editingField === 'password' && (
          <EditPasswordPanel
            hasPassword={profile.has_password}
            onConfirm={handleUpdatePassword}
            onCancel={() => setEditingField(null)}
          />
        )}

        <AgendaCard />
      </div>
    </div>
  );
}