import { ulid } from 'ulid';

export function makeId(prefix) {
  return `${prefix}_${ulid()}`;
}

export function playerId() {
  return makeId('plr');
}

export function sessionId() {
  return makeId('ses');
}

export function scoreId() {
  return makeId('scr');
}

export function eventId() {
  return makeId('evt');
}

export function assetId() {
  return makeId('ast');
}

export function deliveryId() {
  return makeId('dlv');
}

export function requestId() {
  return makeId('req');
}
