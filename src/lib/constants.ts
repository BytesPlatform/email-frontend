export const APP_CONFIG = {
  name: 'Email Automation',
  description: 'Streamline your email marketing with powerful CSV ingestion, intelligent web scraping, and comprehensive analytics.',
  url: 'https://emailautomation.com',
  version: '1.0.0',
} as const

export const API_CONFIG = {
  baseUrl: 'http://localhost:3000', // Hardcoded to fix port issue
  timeout: 10000,
  retryAttempts: 3,
} as const

export const ROUTES = {
  home: '/',
  login: '/auth/login',
  register: '/auth/register',
  forgotPassword: '/auth/forgot-password',
  dashboard: '/dashboard',
  csvIngestion: '/dashboard/csv-ingestion',
  scraping: '/dashboard/scraping',
  history: '/dashboard/history',
} as const

export const STORAGE_KEYS = {
  authToken: 'auth_token',
  currentUser: 'current_user',
  users: 'users',
  theme: 'theme',
  preferences: 'preferences',
} as const

export const VALIDATION_RULES = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address'
  },
  password: {
    required: true,
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    message: 'Password must be at least 8 characters with uppercase, lowercase, and number'
  },
  name: {
    required: true,
    minLength: 2,
    maxLength: 50,
    message: 'Name must be between 2 and 50 characters'
  }
} as const

export const FILE_CONFIG = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    'text/csv', 
    'application/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // .xlsx
  ],
  allowedExtensions: ['.csv', '.xlsx']
} as const

export const SCRAPING_CONFIG = {
  maxPages: 100,
  defaultDelay: 2000, // 2 seconds
  maxDelay: 10000, // 10 seconds
  minDelay: 1000, // 1 second
} as const
