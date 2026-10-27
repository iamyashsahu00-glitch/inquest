const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config/env');

if (!config.geminiApiKey) {
  console.warn('[geminiService] Warning: GEMINI_API_KEY not set. AI calls will fail.');
}

const genAIPrimary = new GoogleGenerativeAI(config.geminiApiKey);
const genAIBackup = config.geminiApiKeyBackup
  ? new GoogleGenerativeAI(config.geminiApiKeyBackup)
  : null;

const MODEL_CHAIN = ['gemini-3.5-flash-lite', 'gemini-flash-latest', 'gemini-3.6-flash'];
const VISION_MODEL_CHAIN = ['gemini-3.5-flash-lite', 'gemini-flash-latest', 'gemini-3.6-flash'];

const CALL_TIMEOUT_MS = 12000;
const VISION_TIMEOUT_MS = 15000;
const VISION_ATTEMPT_TIMEOUT_MS = 12000;
const VISION_OVERALL_TIMEOUT_MS = 25000;
const VISION_HEDGE_DELAY_MS = 6000;

const visionGenerationConfig = {
  temperature: 0,
  responseMimeType: 'application/json',
  maxOutputTokens: 1024,
};

function getVisionModel(genAI, modelName) {
  try {
    return genAI.getGenerativeModel({
      model: modelName,
      generationConfig: visionGenerationConfig,
    });
  } catch {
    return genAI.getGenerativeModel({ model: modelName });
  }
}

function isQuotaExhausted(err) {
  return /429|quota|resource_exhausted/i.test(err?.message || '');
}

function isTransientError(err) {
  return /503|overloaded|high demand/i.test(err?.message || '') || isQuotaExhausted(err);
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms)),
  ]);
}

async function tryModelChain(genAI, models, buildCall, timeoutMs) {
  let lastError;
  for (const modelName of models) {
    const model = genAI.getGenerativeModel({ model: modelName });
    try {
      const result = await withTimeout(buildCall(model), timeoutMs);
      return result.response.text();
    } catch (err) {
      lastError = err;
      continue;
    }
  }
  throw lastError;
}

/**
 * Hedged vision execution:
 * Starts model #1 immediately. If no response within 6s, starts model #2 in parallel (then #3).
 * Returns the first successful response and cleans up remaining timers.
 * Per-attempt timeout: 12s. Overall cap: 25s.
 */
function runHedgedVision(genAI, models, parts) {
  return new Promise((resolve, reject) => {
    let isSettled = false;
    let completedCount = 0;
    const errors = [];
    const timers = [];

    const overallTimer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        cleanup();
        const err = errors.length > 0 ? errors[errors.length - 1] : new Error('Hedged vision timed out (overall cap 25s)');
        reject(err);
      }
    }, VISION_OVERALL_TIMEOUT_MS);

    function cleanup() {
      clearTimeout(overallTimer);
      timers.forEach((t) => clearTimeout(t));
    }

    function launchAttempt(modelIndex) {
      if (isSettled || modelIndex >= models.length) return;
      const modelName = models[modelIndex];

      let attemptTimer = null;
      const attemptPromise = (async () => {
        const model = getVisionModel(genAI, modelName);
        return await model.generateContent(parts);
      })();

      const timeoutPromise = new Promise((_, rej) => {
        attemptTimer = setTimeout(() => {
          rej(new Error(`Model ${modelName} timed out after ${VISION_ATTEMPT_TIMEOUT_MS}ms`));
        }, VISION_ATTEMPT_TIMEOUT_MS);
      });

      Promise.race([attemptPromise, timeoutPromise])
        .then((result) => {
          clearTimeout(attemptTimer);
          if (!isSettled) {
            isSettled = true;
            cleanup();
            resolve(result.response.text());
          }
        })
        .catch((err) => {
          clearTimeout(attemptTimer);
          errors.push(err);
          completedCount++;
          if (completedCount >= models.length && !isSettled) {
            isSettled = true;
            cleanup();
            reject(errors[errors.length - 1] || new Error('All vision models failed'));
          }
        });

      if (modelIndex + 1 < models.length) {
        const nextTimer = setTimeout(() => {
          if (!isSettled) {
            launchAttempt(modelIndex + 1);
          }
        }, VISION_HEDGE_DELAY_MS);
        timers.push(nextTimer);
      }
    }

    launchAttempt(0);
  });
}

async function runHedgedVisionWithKeyFallback(models, parts) {
  try {
    return await runHedgedVision(genAIPrimary, models, parts);
  } catch (primaryErr) {
    if (isQuotaExhausted(primaryErr) && genAIBackup) {
      console.warn('[geminiService] Primary key quota exhausted for vision — retrying hedged chain with backup key');
      try {
        return await runHedgedVision(genAIBackup, models, parts);
      } catch (backupErr) {
        throw isQuotaExhausted(backupErr)
          ? new Error(`GEMINI_QUOTA_EXHAUSTED: ${backupErr.message}`)
          : backupErr;
      }
    }
    throw isQuotaExhausted(primaryErr)
      ? new Error(`GEMINI_QUOTA_EXHAUSTED: ${primaryErr.message}`)
      : primaryErr;
  }
}

/**
 * Runs the model chain against the primary key. If every model on the
 * primary key fails due to quota exhaustion (free-tier daily limit) and a
 * backup key is configured, retries the full chain once on the backup key
 * before giving up.
 */
async function runWithKeyFallback(models, buildCall, timeoutMs) {
  try {
    return await tryModelChain(genAIPrimary, models, buildCall, timeoutMs);
  } catch (primaryErr) {
    if (isQuotaExhausted(primaryErr) && genAIBackup) {
      console.warn('[geminiService] Primary key quota exhausted — retrying with backup key');
      try {
        return await tryModelChain(genAIBackup, models, buildCall, timeoutMs);
      } catch (backupErr) {
        throw isQuotaExhausted(backupErr)
          ? new Error(`GEMINI_QUOTA_EXHAUSTED: ${backupErr.message}`)
          : backupErr;
      }
    }
    throw isQuotaExhausted(primaryErr)
      ? new Error(`GEMINI_QUOTA_EXHAUSTED: ${primaryErr.message}`)
      : primaryErr;
  }
}

async function generateContent(prompt) {
  return runWithKeyFallback(MODEL_CHAIN, (model) => model.generateContent(prompt), CALL_TIMEOUT_MS);
}

async function generateVisionContent(prompt, images, options = {}) {
  const parts = [
    { text: prompt },
    ...images.map((img) => ({ inlineData: { data: img.data, mimeType: img.mimeType } })),
  ];

  if (options.sequential) {
    return runWithKeyFallback(VISION_MODEL_CHAIN, (model) => model.generateContent(parts), VISION_TIMEOUT_MS);
  }

  return runHedgedVisionWithKeyFallback(VISION_MODEL_CHAIN, parts);
}

function extractJSON(raw) {
  if (!raw || typeof raw !== 'string') {
    throw new Error('Empty response from AI model');
  }
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (initialErr) {
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      let candidateArr = cleaned.substring(firstBracket, lastBracket + 1);
      candidateArr = candidateArr.replace(/,\s*]/g, ']').replace(/,\s*}/g, '}');
      try {
        return JSON.parse(candidateArr);
      } catch {}
    }

    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      let candidate = cleaned.substring(firstBrace, lastBrace + 1);
      candidate = candidate.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
      try {
        return JSON.parse(candidate);
      } catch (innerErr) {
        throw initialErr;
      }
    }
    throw initialErr;
  }
}

async function generateJSON(prompt) {
  const raw = await generateContent(prompt);
  return extractJSON(raw);
}

async function generateVisionJSON(prompt, images, options = {}) {
  const raw = await generateVisionContent(prompt, images, options);
  return extractJSON(raw);
}

module.exports = { generateContent, generateJSON, generateVisionContent, generateVisionJSON };
