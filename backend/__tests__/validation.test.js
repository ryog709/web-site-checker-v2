import { validateUrl } from '../src/utils/validation.js';

describe('validateUrl', () => {
  test('should return null for valid HTTPS URL', () => {
    expect(validateUrl('https://example.com')).toBe(null);
    expect(validateUrl('https://www.google.com')).toBe(null);
  });

  test('should return error for missing URL', () => {
    expect(validateUrl()).toBe('URL is required');
    expect(validateUrl('')).toBe('URL is required');
    expect(validateUrl(null)).toBe('URL is required');
  });

  test('should return error for non-string URL', () => {
    expect(validateUrl(123)).toBe('URL must be a string');
    expect(validateUrl({})).toBe('URL must be a string');
    expect(validateUrl([])).toBe('URL must be a string');
  });

  test('should return error for non-HTTPS URLs', () => {
    expect(validateUrl('http://example.com')).toBe('Only HTTPS URLs are allowed');
    expect(validateUrl('ftp://example.com')).toBe('Only HTTPS URLs are allowed');
  });

  test('should return error for localhost URLs', () => {
    expect(validateUrl('https://localhost')).toBe('Localhost URLs are not allowed');
    expect(validateUrl('https://127.0.0.1')).toBe('Localhost URLs are not allowed');
  });

  test('should return error for IP addresses', () => {
    expect(validateUrl('https://192.168.1.1')).toBe('IP addresses are not allowed');
    expect(validateUrl('https://10.0.0.1')).toBe('IP addresses are not allowed');
  });

  test('should return error for invalid URL format', () => {
    expect(validateUrl('not-a-url')).toBe('Invalid URL format');
    expect(validateUrl('https://')).toBe('Invalid URL format');
  });
});