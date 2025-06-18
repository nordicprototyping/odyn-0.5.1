import { useState, useCallback, FormEvent } from 'react';

export type ValidationRule<T> = {
  validate: (value: any, formData: T) => boolean;
  message: string;
};

export type FieldValidation<T> = {
  [K in keyof T]?: ValidationRule<T>[];
};

export interface UseFormOptions<T> {
  initialValues: T;
  onSubmit?: (values: T) => Promise<void> | void;
  validate?: FieldValidation<T> | ((values: T) => Record<string, string> | null);
  resetOnSubmit?: boolean;
}

export interface UseFormResult<T> {
  values: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
  submitError: string | null;
  submitSuccess: string | null;
  setValue: <K extends keyof T>(field: K, value: T[K]) => void;
  setValues: (values: Partial<T>) => void;
  setNestedValue: (path: string, value: any) => void;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleSubmit: (e: FormEvent) => Promise<void>;
  resetForm: () => void;
  setSubmitError: (error: string | null) => void;
  setSubmitSuccess: (message: string | null) => void;
}

export function useForm<T extends Record<string, any>>({
  initialValues,
  onSubmit,
  validate,
  resetOnSubmit = false
}: UseFormOptions<T>): UseFormResult<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Function to validate the form
  const validateForm = useCallback(() => {
    if (!validate) return {};

    if (typeof validate === 'function') {
      return validate(values) || {};
    }

    const validationErrors: Record<string, string> = {};
    
    Object.entries(validate).forEach(([field, rules]) => {
      if (!rules) return;
      
      for (const rule of rules) {
        const isValid = rule.validate(values[field], values);
        if (!isValid) {
          validationErrors[field] = rule.message;
          break;
        }
      }
    });

    return validationErrors;
  }, [values, validate]);

  // Check if the form is valid
  const isValid = Object.keys(validateForm()).length === 0;

  // Set a single field value
  const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValues(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  // Set multiple field values at once
  const setFormValues = useCallback((newValues: Partial<T>) => {
    setValues(prev => ({ ...prev, ...newValues }));
    
    // Mark all updated fields as touched
    const touchedFields = Object.keys(newValues).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as Record<string, boolean>);
    
    setTouched(prev => ({ ...prev, ...touchedFields }));
  }, []);

  // Set a nested field value using dot notation (e.g., 'user.address.city')
  const setNestedValue = useCallback((path: string, value: any) => {
    setValues(prev => {
      const newValues = { ...prev };
      const keys = path.split('.');
      let current: any = newValues;
      
      // Navigate to the nested object that contains the field to update
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      // Update the field
      current[keys[keys.length - 1]] = value;
      return newValues;
    });
    
    setTouched(prev => ({ ...prev, [path]: true }));
  }, []);

  // Handle input change events
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Handle different input types
    if (type === 'checkbox') {
      setValue(name as keyof T, (e.target as HTMLInputElement).checked as any);
    } else if (type === 'number' || type === 'range') {
      setValue(name as keyof T, parseFloat(value) as any);
    } else {
      setValue(name as keyof T, value as any);
    }
  }, [setValue]);

  // Handle input blur events
  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    
    // Validate on blur
    const validationErrors = validateForm();
    setErrors(validationErrors);
  }, [validateForm]);

  // Handle form submission
  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    
    // Validate the form
    const validationErrors = validateForm();
    setErrors(validationErrors);
    
    // Mark all fields as touched
    const allTouched = Object.keys(values).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as Record<string, boolean>);
    
    setTouched(allTouched);
    
    // If there are validation errors, don't submit
    if (Object.keys(validationErrors).length > 0) {
      setSubmitError('Please fix the errors in the form');
      return;
    }
    
    // Clear previous submission states
    setSubmitError(null);
    setSubmitSuccess(null);
    setIsSubmitting(true);
    
    try {
      // Call the onSubmit handler if provided
      if (onSubmit) {
        await onSubmit(values);
      }
      
      // Reset the form if resetOnSubmit is true
      if (resetOnSubmit) {
        resetForm();
      }
      
      // Set success message
      setSubmitSuccess('Form submitted successfully');
    } catch (error) {
      // Set error message
      setSubmitError(error instanceof Error ? error.message : 'An error occurred while submitting the form');
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validateForm, onSubmit, resetOnSubmit]);

  // Reset the form to initial values
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setSubmitError(null);
    setSubmitSuccess(null);
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    submitError,
    submitSuccess,
    setValue,
    setValues: setFormValues,
    setNestedValue,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setSubmitError,
    setSubmitSuccess
  };
}