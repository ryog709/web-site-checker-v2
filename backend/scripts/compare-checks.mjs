#!/usr/bin/env node

import { checkSinglePage } from '../src/services/checker.js';
import { run as runPipeline } from '../src/services/pipeline/AnalysisPipeline/index.js';

const [, , targetUrl = 'https://example.com', authUser, authPass] = process.argv;

const auth = authUser && authPass ? { username: authUser, password: authPass } : null;

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function collectDiffs(legacy, pipeline, path = []) {
  const diffs = [];

  const keys = new Set([
    ...Object.keys(legacy ?? {}),
    ...Object.keys(pipeline ?? {}),
  ]);

  for (const key of keys) {
    const legacyValue = legacy?.[key];
    const pipelineValue = pipeline?.[key];
    const nextPath = [...path, key];

    if (key === 'timestamp') {
      continue; // 時刻差分は無視
    }

    if (isObject(legacyValue) && isObject(pipelineValue)) {
      diffs.push(...collectDiffs(legacyValue, pipelineValue, nextPath));
      continue;
    }

    const legacyJson = JSON.stringify(legacyValue);
    const pipelineJson = JSON.stringify(pipelineValue);

    if (legacyJson !== pipelineJson) {
      diffs.push({ path: nextPath.join('.'), legacy: legacyValue, pipeline: pipelineValue });
    }
  }

  return diffs;
}

console.log('🔍 比較開始:', targetUrl);

const legacyResult = await checkSinglePage(targetUrl, auth);
const pipelineResult = await runPipeline(targetUrl, auth);

const diffs = collectDiffs(legacyResult, pipelineResult);

if (diffs.length === 0) {
  console.log('✅ 差分なし: 両エンドポイントは同じレスポンスです');
} else {
  console.log(`⚠️ 差分あり (${diffs.length}件)`);
  diffs.slice(0, 20).forEach(({ path, legacy, pipeline }) => {
    console.log('---');
    console.log('Path:', path);
    console.log('legacy:', legacy);
    console.log('pipeline:', pipeline);
  });

  if (diffs.length > 20) {
    console.log(`…ほか ${diffs.length - 20} 件`);
  }
}

process.exit(0);
