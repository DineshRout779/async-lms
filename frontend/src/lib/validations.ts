import * as Yup from 'yup';

export const loginSchema = Yup.object({
  email: Yup.string().email('Invalid email address').required('Email is required'),
  password: Yup.string().min(8, 'Must be at least 8 characters').required('Password is required'),
});

export const signupSchema = Yup.object({
  full_name: Yup.string().min(2, 'Name is too short').required('Name is required'),
  email: Yup.string().email('Invalid email address').required('Email is required'),
  password: Yup.string().min(8, 'Must be at least 8 characters').required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords do not match')
    .required('Please confirm your password'),
  role: Yup.string()
    .oneOf(['student', 'facilitator'], 'Select a valid role')
    .required('Please select a role'),
});
