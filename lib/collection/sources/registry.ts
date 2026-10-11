import {forbesAdapter} from './forbes';
import {colliderAdapter,deadlineAdapter,thrAdapter,varietyAdapter} from './sitemaps';
import {starWarsAdapter} from './starwars';
import {swnnAdapter} from './swnn';
import type {SourceAdapter} from './types';

export const sourceAdapters:readonly SourceAdapter[]=[starWarsAdapter,swnnAdapter,colliderAdapter,thrAdapter,deadlineAdapter,varietyAdapter,forbesAdapter];
