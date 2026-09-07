import type { ApiJson } from '../src/docs/generated/api-types';

export const OUTPUT_PATH: string;
export function extract(): ApiJson;
export function serialize(api: ApiJson): string;
