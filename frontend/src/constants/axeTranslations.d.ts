// Type definitions for axeTranslations.js

export interface AxeTranslation {
  help: string;
  description: string;
  fixHint: string;
}

export interface AxeTranslations {
  [ruleId: string]: AxeTranslation;
}

export interface ImpactTranslations {
  [impact: string]: string;
}

export interface WcagLevelTranslations {
  [level: string]: string;
}

export interface CategoryTranslations {
  [category: string]: string;
}

export declare const axeTranslations: AxeTranslations;
export declare const impactTranslations: ImpactTranslations;
export declare const wcagLevelTranslations: WcagLevelTranslations;
export declare const categoryTranslations: CategoryTranslations;

export declare function getAxeTranslation(ruleId: string): AxeTranslation;
export declare function translateImpact(impact: string): string;
export declare function translateWcagTag(tag: string): string;