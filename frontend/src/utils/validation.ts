import { HealthProfile } from '../types';

export interface ValidationErrors {
  [field: string]: string;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

export function validateImageFile(file: File): string | null {
  const lowerName = file.name.toLowerCase();
  const hasValidExt =
    lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.png');

  if (!ALLOWED_IMAGE_TYPES.includes(file.type) && !hasValidExt) {
    return 'Unsupported file format. Please upload a JPG, JPEG, or PNG image.';
  }

  if (file.size === 0) {
    return 'The selected file appears to be empty.';
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return 'File exceeds the 8 MB limit. Please choose a smaller label photo.';
  }

  return null;
}

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return 'Email address is required.';
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(trimmed)) return 'Please enter a valid email address.';
  return null;
}

export function validateLoginForm(email: string, password: string): ValidationErrors {
  const errors: ValidationErrors = {};
  const emailErr = validateEmail(email);
  if (emailErr) errors.email = emailErr;

  if (!password) {
    errors.password = 'Password is required.';
  } else if (password.length < 6) {
    errors.password = 'Password must be at least 6 characters.';
  }

  return errors;
}

export function validateRegisterForm(values: {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
}): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!values.fullName.trim()) {
    errors.fullName = 'Full name is required.';
  } else if (values.fullName.trim().length < 2) {
    errors.fullName = 'Please enter at least 2 characters.';
  }

  const emailErr = validateEmail(values.email);
  if (emailErr) errors.email = emailErr;

  if (!values.password) {
    errors.password = 'Password is required.';
  } else if (values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password.';
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  if (!values.acceptedTerms) {
    errors.acceptedTerms = 'You must accept the terms of service to continue.';
  }

  return errors;
}

export function validateHealthProfile(profile: HealthProfile): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!profile.personal.fullName.trim()) {
    errors.fullName = 'Full name is required.';
  }

  if (profile.personal.age.trim()) {
    const ageNum = Number(profile.personal.age);
    if (!Number.isFinite(ageNum) || ageNum < 13 || ageNum > 120) {
      errors.age = 'Age must be a number between 13 and 120.';
    }
  }

  if (profile.personal.heightCm.trim()) {
    const heightNum = Number(profile.personal.heightCm);
    if (!Number.isFinite(heightNum) || heightNum < 80 || heightNum > 260) {
      errors.heightCm = 'Height must be between 80 cm and 260 cm.';
    }
  }

  if (profile.personal.weightKg.trim()) {
    const weightNum = Number(profile.personal.weightKg);
    if (!Number.isFinite(weightNum) || weightNum < 25 || weightNum > 300) {
      errors.weightKg = 'Weight must be between 25 kg and 300 kg.';
    }
  }

  return errors;
}

export function validatePasswordChange(values: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!values.currentPassword) {
    errors.currentPassword = 'Enter your current password.';
  }

  if (!values.newPassword) {
    errors.newPassword = 'Enter a new password.';
  } else if (values.newPassword.length < 8) {
    errors.newPassword = 'New password must be at least 8 characters.';
  } else if (values.newPassword === values.currentPassword) {
    errors.newPassword = 'New password must differ from your current password.';
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Confirm your new password.';
  } else if (values.newPassword !== values.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
}
