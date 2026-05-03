// Re-exports both `components` (visual / behavioural blocks) and
// `controls` (form-control molecules) under one namespace so callers
// can import either flat. For tighter scoping, import directly from
// the subfolder — `from '@/components/shared/controls'`.

export * from './components';
export * from './controls';
