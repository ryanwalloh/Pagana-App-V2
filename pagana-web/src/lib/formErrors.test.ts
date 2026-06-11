import { describe, expect, it, vi } from 'vitest';

import { applyServerErrors } from './formErrors';

describe('applyServerErrors', () => {
  it('maps known field errors onto the form', () => {
    const setError = vi.fn();
    applyServerErrors(
      {
        status: 400,
        message: 'Please correct the highlighted fields.',
        fieldErrors: { email: ['Already exists.'], password: ['Too short.', 'Too common.'] },
      },
      setError,
      ['email', 'password'],
    );

    expect(setError).toHaveBeenCalledWith('email', {
      type: 'server',
      message: 'Already exists.',
    });
    expect(setError).toHaveBeenCalledWith('password', {
      type: 'server',
      message: 'Too short. Too common.',
    });
  });

  it('routes unknown field errors to the root error', () => {
    const setError = vi.fn();
    applyServerErrors(
      {
        status: 400,
        message: 'Please correct the highlighted fields.',
        fieldErrors: { merchant_name: ['Required.'] },
      },
      setError,
      ['email'],
    );

    expect(setError).toHaveBeenCalledWith('root.serverError', {
      type: 'server',
      message: 'Required.',
    });
  });

  it('sets the root error when there are no field errors', () => {
    const setError = vi.fn();
    applyServerErrors(
      { status: 500, message: 'Something went wrong. Please try again.' },
      setError,
      ['email'],
    );

    expect(setError).toHaveBeenCalledWith('root.serverError', {
      type: 'server',
      message: 'Something went wrong. Please try again.',
    });
  });
});
