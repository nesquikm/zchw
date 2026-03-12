export { generateDataset, type GeneratedDataset, type GeneratorOptions } from './generator.js';

/** Default dataset with seed 42 */
import { generateDataset } from './generator.js';
export const defaultDataset = generateDataset({ seed: 42 });
