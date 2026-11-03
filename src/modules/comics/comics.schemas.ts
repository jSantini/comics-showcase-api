import { errorSchema } from '../../shared/errors.js';

export interface Comic {
  readonly id: number;
  readonly title: string;
  readonly description: string;
  readonly series: string;
  readonly issueNumber?: number;
  readonly volumeNumber?: number;
  readonly genre: string;
  readonly publicationYear: number;
  readonly shortSynopsis: string;
  readonly synopsis: string;
  readonly coverKey: string;
}

const text = { type: 'string', minLength: 1 } as const;
const positiveInteger = { type: 'integer', minimum: 1 } as const;
export const comicSchema = {
  type: 'object', additionalProperties: false,
  required: ['id', 'title', 'description', 'series', 'genre', 'publicationYear', 'shortSynopsis', 'synopsis', 'coverKey'],
  properties: {
    id: positiveInteger, title: text, description: text, series: text,
    issueNumber: positiveInteger, volumeNumber: positiveInteger, genre: text,
    publicationYear: positiveInteger, shortSynopsis: text, synopsis: text, coverKey: text,
  },
} as const;

export const listSchema = {
  response: { 200: {
    type: 'object', additionalProperties: false, required: ['data'],
    properties: { data: {
      type: 'object', additionalProperties: false, required: ['results'],
      properties: { results: { type: 'array', items: comicSchema } },
    } },
  }, 500: errorSchema },
} as const;
export const detailSchema = {
  params: {
    type: 'object', additionalProperties: false, required: ['id'],
    properties: { id: { type: 'string', pattern: '^[1-9][0-9]*$', maxLength: 10 } },
  },
  response: { 200: comicSchema, 400: errorSchema, 404: errorSchema, 500: errorSchema },
} as const;
