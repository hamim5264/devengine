const { HttpsError } = require('firebase-functions/v2/https');
const FREE_ROUTER = 'openrouter/free';
const DEFAULT_PAID_MODEL = 'google/gemini-2.5-flash';
const isFreeModel = model => model === FREE_ROUTER || /^[a-z0-9._-]+\/[a-z0-9._/-]+:free$/i.test(model);
function routingSettings(input, result) {
  // Legacy configurations default to free, even when their old model was paid.
  if (!['free', 'paid'].includes(result.billingMode)) throw new HttpsError('invalid-argument', 'Choose free or paid mode.');
  if (!input.freeModel && isFreeModel(input.model)) result.freeModel = input.model;
  if (!input.paidModel && typeof input.model === 'string' && !isFreeModel(input.model)) result.paidModel = input.model;
  if (!isFreeModel(result.freeModel)) throw new HttpsError('invalid-argument', 'Free mode requires openrouter/free or a model ending in :free.');
  if (!/^[a-z0-9._-]+\/[a-z0-9._:/-]+$/i.test(result.paidModel) || result.paidModel.length > 160 || isFreeModel(result.paidModel)) throw new HttpsError('invalid-argument', 'Choose a valid paid model.');
  if (result.freeModel.length > 160) throw new HttpsError('invalid-argument', 'Choose a valid free model.');
  result.model = result.billingMode === 'paid' ? result.paidModel : result.freeModel;
  return result;
}
function requestPolicy(settings) {
  const free = settings.billingMode !== 'paid';
  const model = free ? (settings.freeModel || FREE_ROUTER) : settings.paidModel;
  if (free && !isFreeModel(model)) throw new HttpsError('failed-precondition', 'Paid models are blocked in free mode.');
  return { free, model, webSearch: !free && settings.webSearchEnabled };
}
module.exports = { FREE_ROUTER, DEFAULT_PAID_MODEL, isFreeModel, routingSettings, requestPolicy };
