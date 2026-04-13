// ----------------------------------------------------------------------

export function createMockCaptchaResponse(
  overrides?: Partial<{ captchaId: string; svgImage: string }>
) {
  return {
    captchaId: 'captcha-test-001',
    svgImage:
      '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="56"><text>1234</text></svg>',
    ...overrides,
  };
}
