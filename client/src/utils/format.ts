/**
 * Utility functions for Russian pluralization and time formatting
 */

export function formatTomatoCount(count: number, wordType: 'томат' | 'помидор' = 'томат'): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  let form = '';

  if (wordType === 'томат') {
    if (mod100 >= 11 && mod100 <= 19) {
      form = 'томатов';
    } else if (mod10 === 1) {
      form = 'томат';
    } else if (mod10 >= 2 && mod10 <= 4) {
      form = 'томата';
    } else {
      form = 'томатов';
    }
  } else {
    if (mod100 >= 11 && mod100 <= 19) {
      form = 'помидоров';
    } else if (mod10 === 1) {
      form = 'помидор';
    } else if (mod10 >= 2 && mod10 <= 4) {
      form = 'помидора';
    } else {
      form = 'помидоров';
    }
  }

  return `${count} ${form}`;
}
