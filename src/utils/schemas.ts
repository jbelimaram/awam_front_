import { z } from 'zod';

const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/; // lettres, espaces, tirets, apostrophes (Jean-Pierre, O'Brien)

export const nameField = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} est requis.`)
    .max(50, `${label} ne doit pas dépasser 50 caractères.`)
    .regex(nameRegex, `${label} ne doit contenir que des lettres.`);

export const emailField = z
  .string()
  .trim()
  .min(1, "L'adresse e-mail est requise.")
  .max(100, "L'adresse e-mail ne doit pas dépasser 100 caractères.")
  .email('Adresse e-mail invalide.');

export const newPasswordField = z
  .string()
  .min(1, 'Le mot de passe est requis.')
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères.')
  .max(72, 'Le mot de passe ne doit pas dépasser 72 caractères.');

export const registerSchema = z
  .object({
    firstName: nameField('Le prénom'),
    lastName: nameField('Le nom'),
    email: emailField,
    password: newPasswordField,
    confirmPassword: z.string().min(1, 'Veuillez confirmer le mot de passe.'),
    acceptTerms: z.literal(true, {
      message: "Vous devez accepter les conditions d'utilisation.",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas.',
    path: ['confirmPassword'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Le mot de passe est requis.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const forgotPasswordEmailSchema = z.object({ email: emailField });
export type ForgotPasswordEmailValues = z.infer<typeof forgotPasswordEmailSchema>;

export const resetPasswordSchema = z
  .object({
    password: newPasswordField,
    confirmPassword: z.string().min(1, 'Veuillez confirmer le mot de passe.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas.',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;



export const fullNameUpdateSchema = z.object({
  full_name: nameField('Le nom complet'),
});
export type FullNameUpdateValues = z.infer<typeof fullNameUpdateSchema>;

const usernameRegex = /^[a-zA-Z0-9_-]+$/;

export const usernameUpdateSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Le nom d'utilisateur doit contenir au moins 3 caractères.")
    .max(50, "Le nom d'utilisateur ne doit pas dépasser 50 caractères.")
    .regex(usernameRegex, "Le nom d'utilisateur ne doit contenir que des lettres, chiffres, tirets et underscores."),
});
export type UsernameUpdateValues = z.infer<typeof usernameUpdateSchema>;

export const emailUpdateSchema = z.object({
  email: emailField,
});
export type EmailUpdateValues = z.infer<typeof emailUpdateSchema>;

export const passwordUpdateSchema = z
  .object({
    current_password: z.string().optional(),
    new_password: newPasswordField,
    confirm_password: z.string().min(1, 'Veuillez confirmer le mot de passe.'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Les mots de passe ne correspondent pas.',
    path: ['confirm_password'],
  });
export type PasswordUpdateValues = z.infer<typeof passwordUpdateSchema>;

export const buildPasswordUpdateSchema = (hasPassword: boolean) =>
  z
    .object({
      current_password: hasPassword
        ? z.string().min(1, "L'ancien mot de passe est requis.")
        : z.string().optional(),
      new_password: newPasswordField,
      confirm_password: z.string().min(1, 'Veuillez confirmer le mot de passe.'),
    })
    .refine((data) => data.new_password === data.confirm_password, {
      message: 'Les mots de passe ne correspondent pas.',
      path: ['confirm_password'],
    });

export type PasswordUpdateFormValues = z.infer<ReturnType<typeof buildPasswordUpdateSchema>>;

export const agendaStatusValues = ['a_faire', 'fait', 'annule', 'reporte'] as const;
export const agendaReminderValues = ['15_min', '1_hour', '1_day', '1_week', 'custom'] as const;

export const reminderUnitValues = ['minutes', 'hours', 'days'] as const;

export const agendaEventSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Le titre est requis.')
      .max(150, 'Le titre ne doit pas dépasser 150 caractères.'),
    description: z.string().max(1000, 'La description ne doit pas dépasser 1000 caractères.').optional(),
    start_datetime: z.string().min(1, 'La date de début est requise.'),
    end_datetime: z.string().optional(),
    status: z.enum(agendaStatusValues),
    reminder: z.enum(agendaReminderValues).optional(),
    reminder_custom_amount: z
      .union([z.string(), z.number()])
      .optional()
      .transform((v) => (v === '' || v === undefined ? undefined : Number(v))),
    reminder_custom_unit: z.enum(reminderUnitValues).optional(),
  })
  .refine(
    (data) => !data.end_datetime || new Date(data.end_datetime) >= new Date(data.start_datetime),
    { message: 'La date de fin ne peut pas être avant la date de début.', path: ['end_datetime'] }
  )
  .refine(
    (data) =>
      data.reminder !== 'custom' ||
      (data.reminder_custom_amount !== undefined && data.reminder_custom_amount > 0 && !!data.reminder_custom_unit),
    { message: 'Indiquez une valeur et une unité valides pour le rappel personnalisé.', path: ['reminder_custom_amount'] }
  );

export type AgendaEventFormValues = z.infer<typeof agendaEventSchema>;