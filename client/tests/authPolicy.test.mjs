import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPasswordRules, validateClientPassword } from '../src/utils/passwordPolicy.ts';

test('Password policy validation rules on frontend', () => {
  // Test too short
  const shortResult = validateClientPassword('Aa1!');
  assert.strictEqual(shortResult.isValid, false);
  assert.match(shortResult.message, /at least 8 characters/i);

  // Test no letters
  const noLetterResult = validateClientPassword('12345678!@#$');
  assert.strictEqual(noLetterResult.isValid, false);
  assert.match(noLetterResult.message, /at least one letter/i);

  // Test no numbers
  const noNumberResult = validateClientPassword('Password!@#$');
  assert.strictEqual(noNumberResult.isValid, false);
  assert.match(noNumberResult.message, /at least one number/i);

  // Test no special char
  const noSpecialResult = validateClientPassword('Password1234');
  assert.strictEqual(noSpecialResult.isValid, false);
  assert.match(noSpecialResult.message, /special character/i);

  // Test valid password
  const validResult = validateClientPassword('StrongP@ssw0rd123!');
  assert.strictEqual(validResult.isValid, true);
  assert.strictEqual(validResult.message, undefined);

  // Test individual rules state
  const rules = checkPasswordRules('Aa1!');
  assert.strictEqual(rules.minLength, false);
  assert.strictEqual(rules.hasLetter, true);
  assert.strictEqual(rules.hasNumber, true);
  assert.strictEqual(rules.hasSpecial, true);
});
