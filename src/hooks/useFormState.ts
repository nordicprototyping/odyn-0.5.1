import { useState } from 'react';

/**
 * Custom hook for managing form state with nested objects
 * @param initialState The initial state of the form
 * @returns An object containing the form state, a function to update the form state, and a function to reset the form state
 */
export function useFormState<T>(initialState: T) {
  const [formData, setFormData] = useState<T>(initialState);

  /**
   * Updates a specific field in the form state, supporting nested paths using dot notation
   * @param path The path to the field to update (e.g., 'user.name' or 'address.city')
   * @param value The new value for the field
   */
  const updateFormData = (path: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev };
      const keys = path.split('.');
      let current: any = newData;
      
      // Navigate to the nested object that contains the field to update
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      // Update the field
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  /**
   * Resets the form state to the initial state
   */
  const resetFormData = () => {
    setFormData(initialState);
  };

  /**
   * Updates multiple fields at once
   * @param updates An object containing the fields to update
   */
  const updateMultipleFields = (updates: Partial<T>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  return {
    formData,
    updateFormData,
    resetFormData,
    updateMultipleFields,
    setFormData
  };
}